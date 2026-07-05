import { describe, expect, it } from 'vitest'
import { parseSaveFile, readBlockBytes } from './saveCodec'
import {
  GENERIC_ROW_CHUNK_SIZE,
  STRUCTURED_EDITOR_ERROR_KEYS,
  applyStructuredEdit,
  getStructuredRows,
} from './structuredEditor'

type SampleGameCode = 'FE6' | 'FE7' | 'FE8' | 'UNKNOWN'

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

function writeText(buf: Uint8Array, offset: number, size: number, value: string) {
  const encoded = new TextEncoder().encode(value)
  for (let i = 0; i < size; i += 1) {
    buf[offset + i] = encoded[i] ?? 0
  }
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

function buildSampleSave(gameCode: SampleGameCode = 'FE8'): File {
  const buf = new Uint8Array(0x1400)
  const metadataName =
    gameCode === 'FE6' ? 'AGB-FE6\u0000' : gameCode === 'FE7' ? 'AGB-FE7\u0000' : gameCode === 'FE8' ? 'AGB-FE8\u0000' : 'AGB-UNK\u0000'
  const magic = new TextEncoder().encode(metadataName)
  buf.set(magic, 0x00)
  writeU32(buf, 0x08, 0x40624)
  writeU16(buf, 0x0c, 0x200a)

  for (let blockIndex = 0; blockIndex < 7; blockIndex += 1) {
    const infoOffset = 0x64 + blockIndex * 0x10
    const blockOffset = 0x0200 + blockIndex * 0x0100
    const blockSize = 0x0080

    writeU32(buf, infoOffset, 0x40624 + blockIndex)
    writeU16(buf, infoOffset + 0x04, 0x200a)
    buf[infoOffset + 0x06] = blockIndex
    writeU16(buf, infoOffset + 0x08, blockOffset)
    writeU16(buf, infoOffset + 0x0a, blockSize)

    for (let i = 0; i < blockSize; i += 1) {
      buf[blockOffset + i] = (blockIndex * 17 + i) & 0xff
    }
  }

  writeU32(buf, 0x0208, 12345)
  buf[0x020c] = 2
  buf[0x020e] = 11
  writeU16(buf, 0x0210, 4)
  buf[0x0214] = 0xaa
  buf[0x0218] = 9
  buf[0x021b] = 3
  writeText(buf, 0x0220, 0x0b, 'Eirika')

  writeU32(buf, 0x0308, 54321)
  buf[0x030c] = 3
  buf[0x030e] = 12
  writeU16(buf, 0x0310, 5)
  buf[0x0314] = 0xbb
  buf[0x0318] = 10
  buf[0x031b] = 4
  writeText(buf, 0x0320, 0x0b, 'Lyon')

  for (let blockIndex = 0; blockIndex < 7; blockIndex += 1) {
    const infoOffset = 0x64 + blockIndex * 0x10
    const blockOffset = 0x0200 + blockIndex * 0x0100
    const blockSize = 0x0080
    const blockBody = buf.slice(blockOffset, blockOffset + blockSize)
    writeU32(buf, infoOffset + 0x0c, checksum32(blockBody))
  }

  writeU16(buf, 0x60, checksum16(buf.slice(0, 0x50)))
  return new File([buf], 'structured.sav', { type: 'application/octet-stream' })
}

describe('structuredEditor', () => {
  it('includes domain/group metadata on structured rows', async () => {
    const parsed = await parseSaveFile(buildSampleSave('FE8'))
    const row = getStructuredRows(parsed, 0)[0]
    expect(row).toHaveProperty('domain')
    expect(row).toHaveProperty('groupKey')
    expect(row).toHaveProperty('memberPath')
  })
  it('returns known PlaySt rows for FE8 save and suspend blocks plus generic rows for unknown regions', async () => {
    const parsed = await parseSaveFile(buildSampleSave())

    const saveRows = getStructuredRows(parsed, 0)
    const suspendRows = getStructuredRows(parsed, 1)
    const archiveRows = getStructuredRows(parsed, 6)
    const playerNameRow = saveRows.find((row) => row.labelKey === 'field.playst.playerName')
    const genericSaveRows = saveRows.filter((row) => row.type === 'bytes')

    expect(saveRows.some((row) => row.labelKey === 'field.playst.gold')).toBe(true)
    expect(saveRows.some((row) => row.labelKey === 'field.playst.playerName')).toBe(true)
    expect(saveRows.some((row) => row.type === 'bytes')).toBe(true)
    expect(playerNameRow?.size).toBe(0x0b)
    expect(genericSaveRows.some((row) => row.labelKey === 'field.unknown.bytes')).toBe(true)
    expect(genericSaveRows.some((row) => row.size === GENERIC_ROW_CHUNK_SIZE)).toBe(true)

    expect(suspendRows.some((row) => row.labelKey === 'field.playst.gold')).toBe(true)
    expect(suspendRows.some((row) => row.labelKey === 'field.playst.playerName')).toBe(true)

    expect(archiveRows.length).toBe(parsed.blocks[6].size / GENERIC_ROW_CHUNK_SIZE)
    expect(archiveRows.every((row) => row.type === 'bytes')).toBe(true)
    expect(archiveRows.every((row) => row.size === GENERIC_ROW_CHUNK_SIZE)).toBe(true)
  })

  it('falls back to generic rows for FE6, FE7, and UNKNOWN save blocks', async () => {
    for (const gameCode of ['FE6', 'FE7', 'UNKNOWN'] as const) {
      const parsed = await parseSaveFile(buildSampleSave(gameCode))
      const saveRows = getStructuredRows(parsed, 0)

      expect(parsed.gameCode).toBe(gameCode)
      expect(saveRows.some((row) => row.labelKey === 'field.playst.gold')).toBe(false)
      expect(saveRows.some((row) => row.labelKey === 'field.playst.playerName')).toBe(false)
      expect(saveRows.length).toBe(parsed.blocks[0].size / GENERIC_ROW_CHUNK_SIZE)
      expect(saveRows.every((row) => row.type === 'bytes')).toBe(true)
      expect(saveRows.every((row) => row.size === GENERIC_ROW_CHUNK_SIZE)).toBe(true)
      expect(saveRows.some((row) => row.labelKey === 'field.unknown.bytes')).toBe(true)
    }
  })

  it('applies structured edits to known and generic rows while preserving valid checksums', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const saveRows = getStructuredRows(parsed, 0)
    const goldRow = saveRows.find((row) => row.labelKey === 'field.playst.gold')
    const nameRow = saveRows.find((row) => row.labelKey === 'field.playst.playerName')
    const genericRow = getStructuredRows(parsed, 6).find((row) => row.offset === 0x10)

    expect(goldRow).toBeDefined()
    expect(nameRow).toBeDefined()
    expect(genericRow).toBeDefined()

    const afterGold = applyStructuredEdit(parsed, 0, goldRow!.key, '77777')
    const afterName = applyStructuredEdit(afterGold, 0, nameRow!.key, 'Seth')
    const nextGenericValue = `AB${String(genericRow!.value).slice(2)}`
    const afterGeneric = applyStructuredEdit(afterName, 6, genericRow!.key, nextGenericValue)

    expect(getStructuredRows(afterGeneric, 0).find((row) => row.key === goldRow!.key)?.value).toBe(77777)
    expect(getStructuredRows(afterGeneric, 0).find((row) => row.key === nameRow!.key)?.value).toBe('Seth')
    expect(readBlockBytes(afterGeneric, 6)[0x10]).toBe(0xab)
    expect(afterGeneric.blocks[0].checksumValid).toBe(true)
    expect(afterGeneric.blocks[6].checksumValid).toBe(true)
  })

  it('rejects invalid structured edits without mutating canonical bytes', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const before = parsed.bytes.slice()
    const saveRows = getStructuredRows(parsed, 0)
    const saveSlotRow = saveRows.find((row) => row.labelKey === 'field.playst.saveSlot')
    const genericRow = getStructuredRows(parsed, 6).find((row) => row.offset === 0x00)
    const nameRow = saveRows.find((row) => row.labelKey === 'field.playst.playerName')

    expect(saveSlotRow).toBeDefined()
    expect(genericRow).toBeDefined()
    expect(nameRow).toBeDefined()

    expect(() => applyStructuredEdit(parsed, 0, saveSlotRow!.key, '300')).toThrow(
      STRUCTURED_EDITOR_ERROR_KEYS.outOfRange,
    )
    expect(() => applyStructuredEdit(parsed, 6, genericRow!.key, 'xyz')).toThrow(
      STRUCTURED_EDITOR_ERROR_KEYS.invalidBytes,
    )
    expect(() => applyStructuredEdit(parsed, 0, nameRow!.key, '123456789012')).toThrow(
      STRUCTURED_EDITOR_ERROR_KEYS.textTooLong,
    )
    expect(parsed.bytes).toEqual(before)
  })
})
