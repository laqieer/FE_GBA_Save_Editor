import { describe, expect, it } from 'vitest'
import { parseSaveFile, readBlockBytes } from './saveCodec'
import { applyHexEdit, toHexRows } from './hexEditor'

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
  const buf = new Uint8Array(0x1400)
  const magic = new TextEncoder().encode('AGB-FE8\u0000')
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

  for (let blockIndex = 0; blockIndex < 7; blockIndex += 1) {
    const infoOffset = 0x64 + blockIndex * 0x10
    const blockOffset = 0x0200 + blockIndex * 0x0100
    const blockSize = 0x0080
    const blockBody = buf.slice(blockOffset, blockOffset + blockSize)
    writeU32(buf, infoOffset + 0x0c, checksum32(blockBody))
  }

  writeU16(buf, 0x60, checksum16(buf.slice(0, 0x50)))
  return new File([buf], 'hex-editor.sav', { type: 'application/octet-stream' })
}

describe('hexEditor', () => {
  it('groups block bytes into uppercase hex rows with printable ascii', () => {
    const rows = toHexRows(Uint8Array.from([0x41, 0x42, 0x20, 0x7e, 0x1f, 0x00, 0x43]), 4)

    expect(rows).toEqual([
      { rowOffset: 0, hex: ['41', '42', '20', '7E'], ascii: 'AB ~' },
      { rowOffset: 4, hex: ['1F', '00', '43'], ascii: '..C' },
    ])
  })

  it('rejects invalid bytes-per-row values', () => {
    expect(() => toHexRows(Uint8Array.from([0x41, 0x42]), 1.5)).toThrow('Invalid bytes per row')
  })

  it('applies hex edits across every block while preserving valid checksums', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    let changed = parsed

    for (let blockIndex = 0; blockIndex < 7; blockIndex += 1) {
      const offset = 0x10 + blockIndex
      const nextHexPair = (0xa0 + blockIndex).toString(16).padStart(2, '0')
      changed = applyHexEdit(changed, blockIndex, offset, nextHexPair)

      expect(readBlockBytes(changed, blockIndex)[offset]).toBe(0xa0 + blockIndex)
      expect(changed.blocks[blockIndex].checksumValid).toBe(true)
      expect(changed.generalChecksumValid).toBe(true)
    }
  })

  it('rejects invalid hex pairs without mutating canonical bytes', async () => {
    const parsed = await parseSaveFile(buildSampleSave())
    const before = parsed.bytes.slice()

    expect(() => applyHexEdit(parsed, 5, 0x2a, 'GG')).toThrow('Invalid hex byte')
    expect(() => applyHexEdit(parsed, 5, 0x2a, 'F')).toThrow('Invalid hex byte')
    expect(parsed.bytes).toEqual(before)
  })
})
