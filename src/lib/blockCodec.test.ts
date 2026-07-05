import { describe, expect, it } from 'vitest'
import {
  SAVE_CODEC_ERROR_KEYS,
  parseSaveFile,
  readBlockBytes,
  updateBlockBytes,
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

function buildSampleSave(options: { magic32?: number; kind?: number } = {}): File {
  const { magic32 = 0x40624, kind = 6 } = options
  const buf = new Uint8Array(0x1200)
  const magic = new TextEncoder().encode('AGB-FE8\u0000')
  buf.set(magic, 0x00)
  writeU32(buf, 0x08, 0x40624)
  writeU16(buf, 0x0c, 0x200a)

  writeU32(buf, 0x64 + 6 * 0x10, magic32)
  writeU16(buf, 0x68 + 6 * 0x10, 0x200a)
  buf[0x6a + 6 * 0x10] = kind
  writeU16(buf, 0x6c + 6 * 0x10, 0x0600)
  writeU16(buf, 0x6e + 6 * 0x10, 0x0080)

  for (let i = 0; i < 0x80; i += 1) {
    buf[0x0600 + i] = i
  }

  const blockBody = buf.slice(0x0600, 0x0680)
  writeU32(buf, 0x70 + 6 * 0x10, checksum32(blockBody))
  writeU16(buf, 0x60, checksum16(buf.slice(0, 0x50)))

  return new File([buf], 'sample.sav', { type: 'application/octet-stream' })
}

describe('blockCodec', () => {
  it('updates arbitrary bytes in block #6 and keeps checksum valid', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const original = readBlockBytes(parsed, 6)
    const patch = Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd])
    const changed = updateBlockBytes(parsed, 6, 0x10, patch)

    expect(readBlockBytes(changed, 6).slice(0x10, 0x14)).toEqual(patch)
    expect(changed.blocks[6].checksumValid).toBe(true)
    expect(readBlockBytes(changed, 6).slice(0, 0x10)).toEqual(original.slice(0, 0x10))
  })

  it('rejects absent blocks with zero magic', async () => {
    const parsed = await parseSaveFile(buildSampleSave({ magic32: 0 }))

    expect(() => readBlockBytes(parsed, 6)).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
    expect(() =>
      updateBlockBytes(parsed, 6, 0, Uint8Array.from([0xaa])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  })

  it('rejects absent blocks marked with kind 0xff', async () => {
    const parsed = await parseSaveFile(buildSampleSave({ kind: 0xff }))

    expect(() => readBlockBytes(parsed, 6)).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
    expect(() =>
      updateBlockBytes(parsed, 6, 0, Uint8Array.from([0xaa])),
    ).toThrow(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  })
})
