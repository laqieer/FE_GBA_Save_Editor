import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SAVE_CODEC_ERROR_KEYS,
  decodeSpsBytes,
  normalizeSaveBytes,
  parseSaveFile,
  readBlockBytes,
  serializeSaveFile,
  updatePlayState,
  updateBlockBytes,
  type ParsedSaveFile,
} from './saveCodec'

function writeU16(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >>> 8) & 0xff
}

function writeU32(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >>> 8) & 0xff
  buf[offset + 2] = (value >>> 16) & 0xff
  buf[offset + 3] = (value >>> 24) & 0xff
}

function checksum16(data: Uint8Array): number {
  let addAcc = 0
  let xorAcc = 0
  for (let i = 0; i < data.length; i += 2) {
    const v = data[i] | (data[i + 1] << 8)
    addAcc += v
    xorAcc ^= v
  }
  return (addAcc + xorAcc) & 0xffff
}

function checksum32(data: Uint8Array): number {
  let addAcc = 0
  let xorAcc = 0
  for (let i = 0; i < data.length; i += 2) {
    const v = data[i] | (data[i + 1] << 8)
    addAcc += v
    xorAcc ^= v
  }
  return ((addAcc & 0xffff) | ((xorAcc & 0xffff) << 16)) >>> 0
}

function sharkPortChecksum(data: Uint8Array): number {
  let checksum = 0
  for (let i = 0; i < data.length; i += 1) {
    const signedByte = (data[i] << 24) >> 24
    checksum = (checksum + (signedByte << (checksum % 24))) >>> 0
  }
  return checksum >>> 0
}

function buildValidSampleSramBytes(): Uint8Array {
  const buf = new Uint8Array(0x1000)
  const magic = new TextEncoder().encode('AGB-FE8\u0000')
  buf.set(magic, 0x00)
  writeU32(buf, 0x08, 0x40624)
  writeU16(buf, 0x0c, 0x200a)

  // Save slot 0 block info
  writeU32(buf, 0x64, 0x40624)
  writeU16(buf, 0x68, 0x200a)
  buf[0x6a] = 0 // kind game save
  writeU16(buf, 0x6c, 0x0200)
  writeU16(buf, 0x6e, 0x0080)

  // Fill sample play state at block start
  writeU32(buf, 0x0208, 12345) // gold
  buf[0x020e] = 11 // chapter index
  writeU16(buf, 0x0210, 4) // turn number
  buf[0x0218] = 9 // playthrough id

  const slotBody = buf.slice(0x200, 0x280)
  writeU32(buf, 0x70, checksum32(slotBody))
  writeU16(buf, 0x60, checksum16(buf.slice(0, 0x50)))

  return buf
}

function buildSpsFixtureFromSram(sram: Uint8Array): Uint8Array {
  const header = new Uint8Array(0x1c)
  header.set(new TextEncoder().encode('FE8 SAMPLE SAVE'), 0)
  header[0x10] = 0
  header[0x11] = 0
  header[0x12] = 0x24
  header[0x13] = 0x01
  header[0x14] = 1
  header[0x15] = 0
  header[0x16] = 0
  header[0x17] = 0
  header[0x18] = 0
  header[0x19] = 0
  header[0x1a] = 0
  header[0x1b] = 0

  const totalSize = header.length + sram.length
  const container = new Uint8Array(4 + 'SharkPortSave'.length + 4 + 4 + 16 + 4 + 0 + 4 + 0 + 4 + totalSize + 4)
  let offset = 0
  writeU32(container, offset, 'SharkPortSave'.length)
  offset += 4
  container.set(new TextEncoder().encode('SharkPortSave'), offset)
  offset += 'SharkPortSave'.length
  writeU32(container, offset, 0x000f0000)
  offset += 4
  writeU32(container, offset, 16)
  offset += 4
  container.set(header.slice(0, 16), offset)
  offset += 16
  writeU32(container, offset, 0)
  offset += 4
  writeU32(container, offset, 0)
  offset += 4
  writeU32(container, offset, totalSize)
  offset += 4
  container.set(header, offset)
  offset += header.length
  container.set(sram, offset)
  offset += sram.length
  writeU32(container, offset, sharkPortChecksum(container.slice(offset - totalSize, offset)))
  return container
}

function buildSampleSave(): File {
  const sram = buildValidSampleSramBytes()
  return new File([Uint8Array.from(sram).buffer], 'sample.sav', { type: 'application/octet-stream' })
}

function buildSpsSave(): File {
  const sram = buildValidSampleSramBytes()
  return new File(
    [Uint8Array.from(buildSpsFixtureFromSram(sram)).buffer],
    'sample.sps',
    { type: 'application/octet-stream' },
  )
}

const GAMEFAQS_FIXTURE_DIR = resolve(process.cwd(), 'test-saves', 'gamefaqs')
const FIREEMBLEM_NET_FIXTURE_DIR = resolve(process.cwd(), 'test-saves', 'fireemblem-net')
type FireEmblemNetArchiveAttempt = {
  titleCode: string
  archiveFileName: string
  mappedGameCode: 'FE6' | 'FE7' | 'FE8' | null
  extraction?: {
    success: boolean
    fixtureFiles?: string[]
  }
}
type FireEmblemNetMetadata = {
  archiveAttempts: FireEmblemNetArchiveAttempt[]
}
const REAL_FIXTURE_CASES = [
  { fileName: 'fe7-10530.sps', expectedGameCode: 'FE7', minimumValidBlocks: 1, expectedGeneralChecksumValid: true },
  { fileName: 'fe8-27399.sps', expectedGameCode: 'FE8', minimumValidBlocks: 1, expectedGeneralChecksumValid: true },
] as const
const FIREEMBLEM_NET_REAL_FIXTURE_CASES = [
  {
    archiveFileName: 'FE0702.rar',
    fileName: 'fireemblem-net-fe6-fe0702.sav',
    expectedGameCode: 'FE6',
    minimumPresentBlocks: 3,
    minimumValidBlocks: 0,
    minimumPlayStateBlocks: 1,
    expectedGeneralChecksumValid: false,
  },
  {
    archiveFileName: 'FE0801.zip',
    fileName: 'fireemblem-net-fe7-fe0801.sav',
    expectedGameCode: 'FE7',
    minimumPresentBlocks: 1,
    minimumValidBlocks: 1,
    minimumPlayStateBlocks: 0,
    expectedGeneralChecksumValid: true,
  },
  {
    archiveFileName: 'FE0901.rar',
    fileName: 'fireemblem-net-fe8-fe0901.sav',
    expectedGameCode: 'FE8',
    minimumPresentBlocks: 5,
    minimumValidBlocks: 5,
    minimumPlayStateBlocks: 5,
    expectedGeneralChecksumValid: true,
  },
] as const

async function readFixtureFile(fileName: string): Promise<File> {
  const fixturePath = resolve(GAMEFAQS_FIXTURE_DIR, fileName)
  const bytes = await readFile(fixturePath)
  return new File([bytes], fileName, { type: 'application/octet-stream' })
}

async function readFireEmblemNetFixture(fileName: string): Promise<File> {
  const fixturePath = resolve(FIREEMBLEM_NET_FIXTURE_DIR, fileName)
  const bytes = await readFile(fixturePath)
  return new File([bytes], fileName, { type: 'application/octet-stream' })
}

async function readFireEmblemNetMetadata(): Promise<FireEmblemNetMetadata> {
  return JSON.parse(
    await readFile(resolve(FIREEMBLEM_NET_FIXTURE_DIR, 'sources', 'download-metadata.json'), 'utf8'),
  ) as FireEmblemNetMetadata
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll('\\', '/')
}

describe('saveCodec', () => {
  it('keeps automated real-fixture assertions meaningful', () => {
    expect(REAL_FIXTURE_CASES.every((fixture) => fixture.minimumValidBlocks > 0)).toBe(true)
    expect(REAL_FIXTURE_CASES.every((fixture) => fixture.expectedGeneralChecksumValid !== null)).toBe(true)
  })

  it('has fireemblem.net metadata file with at least one FE07/08/09 archive attempt', async () => {
    const metadata = await readFireEmblemNetMetadata()
    expect(metadata.archiveAttempts.some((x: { titleCode: string }) => /^FE0[789]/.test(x.titleCode))).toBe(true)
  })

  it('records real extracted fireemblem.net fixtures in metadata', async () => {
    const metadata = await readFireEmblemNetMetadata()

    for (const fixture of FIREEMBLEM_NET_REAL_FIXTURE_CASES) {
      const attempt = metadata.archiveAttempts.find((candidate) => candidate.archiveFileName === fixture.archiveFileName)

      expect(attempt?.mappedGameCode).toBe(fixture.expectedGameCode)
      expect(attempt?.extraction?.success).toBe(true)
      expect(
        attempt?.extraction?.fixtureFiles?.map((path) => normalizeRelativePath(path)),
      ).toContain(`test-saves/fireemblem-net/${fixture.fileName}`)
    }
  })

  it('normalizes .sps containers to raw save bytes', () => {
    const sram = buildValidSampleSramBytes()
    const sps = buildSpsFixtureFromSram(sram)

    expect(normalizeSaveBytes('sample.sps', sps)).toEqual(sram)
    expect(decodeSpsBytes(sps)).toEqual(sram)
    expect(normalizeSaveBytes('sample.sav', sram)).toEqual(sram)
  })

  it('parses FE save metadata and verifies slot checksum', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    expect(parsed.gameCode).toBe('FE8')
    expect(parsed.blocks[0].checksumValid).toBe(true)
    expect(parsed.blocks[0].playState?.gold).toBe(12345)
    expect(parsed.blocks[0].playState?.chapterIndex).toBe(11)
  })

  it('parses valid SRAM wrapped in SPS container', async () => {
    const parsed = await parseSaveFile(buildSpsSave())

    expect(parsed.blocks.length).toBe(7)
    expect(parsed.gameCode).toBe('FE8')
    expect(parsed.blocks[0].playState?.gold).toBe(12345)
  })

  it.each(REAL_FIXTURE_CASES)('loads real-world GameFAQs fallback fixture $fileName', async ({
    fileName,
    expectedGameCode,
    minimumValidBlocks,
    expectedGeneralChecksumValid,
  }) => {
    const parsed = await parseSaveFile(await readFixtureFile(fileName))

    expect(parsed.fileName).toBe(fileName)
    expect(parsed.gameCode).toBe(expectedGameCode)
    expect(parsed.blocks.length).toBe(7)
    if (expectedGeneralChecksumValid !== null) {
      expect(parsed.generalChecksumValid).toBe(expectedGeneralChecksumValid)
    } else {
      expect(parsed.generalChecksumValid).toBeTypeOf('boolean')
    }
    expect(parsed.blocks.some((block) => block.offset > 0 && block.size > 0)).toBe(true)
    expect(parsed.blocks.filter((block) => block.checksumValid).length).toBeGreaterThanOrEqual(minimumValidBlocks)
  })

  it.each(FIREEMBLEM_NET_REAL_FIXTURE_CASES)('loads extracted fireemblem.net fixture $fileName', async ({
    fileName,
    expectedGameCode,
    minimumPresentBlocks,
    minimumValidBlocks,
    minimumPlayStateBlocks,
    expectedGeneralChecksumValid,
  }) => {
    const parsed = await parseSaveFile(await readFireEmblemNetFixture(fileName))
    const presentBlocks = parsed.blocks.filter((block) => block.offset > 0 && block.size > 0)
    const playStateBlocks = parsed.blocks.filter((block) => block.playState)

    expect(parsed.fileName).toBe(fileName)
    expect(parsed.gameCode).toBe(expectedGameCode)
    expect(parsed.bytes.length).toBe(0x10000)
    expect(parsed.blocks.length).toBe(7)
    expect(parsed.generalChecksumValid).toBe(expectedGeneralChecksumValid)
    expect(presentBlocks.length).toBeGreaterThanOrEqual(minimumPresentBlocks)
    expect(playStateBlocks.length).toBeGreaterThanOrEqual(minimumPlayStateBlocks)
    expect(parsed.blocks.filter((block) => block.checksumValid).length).toBeGreaterThanOrEqual(minimumValidBlocks)
  })

  it('rejects malformed SPS payload', async () => {
    await expect(parseSaveFile(new File([new Uint8Array([0x53, 0x50, 0x53, 0x00, 0x01])], 'broken.sps'))).rejects.toThrow()
  })

  it('updates play-state fields and re-computes checksums on serialize', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const changed = updatePlayState(parsed, 0, {
      gold: 54321,
      chapterIndex: 18,
      chapterTurn: 7,
    })
    const bytes = serializeSaveFile(changed)
    const reparsed = await parseSaveFile(
      new File([Uint8Array.from(bytes).buffer], 'edited.sav'),
    )

    expect(reparsed.blocks[0].checksumValid).toBe(true)
    expect(reparsed.blocks[0].playState?.gold).toBe(54321)
    expect(reparsed.blocks[0].playState?.chapterIndex).toBe(18)
    expect(reparsed.blocks[0].playState?.chapterTurn).toBe(7)
    expect(reparsed.generalChecksumValid).toBe(true)
  })

  it('returns immutable snapshots when editing', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const changed: ParsedSaveFile = updatePlayState(parsed, 0, { gold: 1 })

    expect(parsed.blocks[0].playState?.gold).toBe(12345)
    expect(changed.blocks[0].playState?.gold).toBe(1)
  })

  it('updates arbitrary bytes in play-state block #0 and keeps checksum valid', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const patch = Uint8Array.from([0xaa, 0xbb, 0xcc])
    const changed = updateBlockBytes(parsed, 0, 0x10, patch)

    expect(readBlockBytes(changed, 0).slice(0x10, 0x13)).toEqual(patch)
    expect(changed.blocks[0].checksumValid).toBe(true)
  })

  it('keeps original bytes unchanged when updateBlockBytes rejects invalid input', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const before = parsed.bytes.slice()

    expect(() =>
      updateBlockBytes(parsed, 0, 0x7f, Uint8Array.from([0xaa, 0xbb])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.patchOutOfRange)
    expect(parsed.bytes).toEqual(before)
  })

  it('rejects non-integer block offsets without mutating canonical bytes', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const before = parsed.bytes.slice()

    expect(() =>
      updateBlockBytes(parsed, 0, Number.NaN, Uint8Array.from([0xaa])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.patchOutOfRange)
    expect(parsed.bytes).toEqual(before)

    expect(() =>
      updateBlockBytes(parsed, 0, 1.5, Uint8Array.from([0xbb])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.patchOutOfRange)
    expect(parsed.bytes).toEqual(before)
  })

  it('throws stable keys for invalid block reads', async () => {
    const parsed = await parseSaveFile(buildSampleSave())

    expect(() => readBlockBytes(parsed, 99)).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  })
})
