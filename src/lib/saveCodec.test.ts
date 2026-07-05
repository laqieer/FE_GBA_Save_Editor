import { describe, expect, it } from 'vitest'
import {
  SAVE_CODEC_ERROR_KEYS,
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

function buildSampleSave(): File {
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

  return new File([buf], 'sample.sav', { type: 'application/octet-stream' })
}

describe('saveCodec', () => {
  it('parses FE save metadata and verifies slot checksum', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    expect(parsed.gameCode).toBe('FE8')
    expect(parsed.blocks[0].checksumValid).toBe(true)
    expect(parsed.blocks[0].playState?.gold).toBe(12345)
    expect(parsed.blocks[0].playState?.chapterIndex).toBe(11)
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

  it('keeps original bytes unchanged when updateBlockBytes rejects invalid input', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const before = parsed.bytes.slice()

    expect(() =>
      updateBlockBytes(parsed, 0, 0x7f, Uint8Array.from([0xaa, 0xbb])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.patchOutOfRange)
    expect(parsed.bytes).toEqual(before)
  })

  it('throws stable keys for invalid block reads', async () => {
    const parsed = await parseSaveFile(buildSampleSave())

    expect(() => readBlockBytes(parsed, 99)).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  })
})
