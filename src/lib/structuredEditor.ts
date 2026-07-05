import { getBlockSchema, type BlockFieldSchema, type FieldType } from './blockSchema'
import { readBlockBytes, updateBlockBytes, type ParsedSaveFile } from './saveCodec'

export type FieldRow = {
  key: string
  offset: number
  size: number
  type: FieldType
  labelKey: string
  value: number | string
}

type ResolvedFieldRow = FieldRow & {
  byteLength: number
}

export const STRUCTURED_EDITOR_ERROR_KEYS = {
  invalidRow: 'structuredEditor.invalidRow',
  invalidInteger: 'structuredEditor.invalidInteger',
  outOfRange: 'structuredEditor.outOfRange',
  invalidBytes: 'structuredEditor.invalidBytes',
  textTooLong: 'structuredEditor.textTooLong',
} as const

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0
}

function readI8(bytes: Uint8Array, offset: number): number {
  const value = bytes[offset]
  return value > 127 ? value - 256 : value
}

function readFixedString(bytes: Uint8Array, offset: number, size: number): string {
  const chars: number[] = []
  for (let i = 0; i < size; i += 1) {
    const value = bytes[offset + i]
    if (value === 0) break
    chars.push(value)
  }
  return new TextDecoder().decode(new Uint8Array(chars))
}

function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0').toUpperCase()).join('')
}

function readValue(bytes: Uint8Array, field: BlockFieldSchema): number | string {
  switch (field.type) {
    case 'u8':
      return bytes[field.offset]
    case 's8':
      return readI8(bytes, field.offset)
    case 'u16':
      return readU16(bytes, field.offset)
    case 'u32':
      return readU32(bytes, field.offset)
    case 'text':
      return readFixedString(bytes, field.offset, field.byteLength)
    case 'bytes':
      return toHexString(bytes.slice(field.offset, field.offset + field.byteLength))
  }
}

function buildKnownRows(bytes: Uint8Array, fields: readonly BlockFieldSchema[]): ResolvedFieldRow[] {
  return fields.map((field) => ({
    key: field.key,
    offset: field.offset,
    size: field.byteLength,
    byteLength: field.byteLength,
    type: field.type,
    labelKey: field.labelKey,
    value: readValue(bytes, field),
  }))
}

function buildGenericRows(bytes: Uint8Array, coveredOffsets: Set<number>): ResolvedFieldRow[] {
  const rows: ResolvedFieldRow[] = []
  for (let offset = 0; offset < bytes.length; offset += 1) {
    if (coveredOffsets.has(offset)) {
      continue
    }
    rows.push({
      key: `byte.${offset.toString(16).padStart(4, '0')}`,
      offset,
      size: 1,
      byteLength: 1,
      type: 'bytes',
      labelKey: 'field.unknown.byte',
      value: toHexString(bytes.slice(offset, offset + 1)),
    })
  }
  return rows
}

function getResolvedRows(parsed: ParsedSaveFile, blockIndex: number): ResolvedFieldRow[] {
  const blockBytes = readBlockBytes(parsed, blockIndex)
  const block = parsed.blocks[blockIndex]
  const schema = getBlockSchema(parsed.gameCode, block.kind).filter(
    (field) => field.offset >= 0 && field.offset + field.byteLength <= blockBytes.length,
  )

  const coveredOffsets = new Set<number>()
  for (const field of schema) {
    for (let offset = field.offset; offset < field.offset + field.byteLength; offset += 1) {
      coveredOffsets.add(offset)
    }
  }

  return [...buildKnownRows(blockBytes, schema), ...buildGenericRows(blockBytes, coveredOffsets)].sort(
    (left, right) => left.offset - right.offset || left.key.localeCompare(right.key),
  )
}

function parseInteger(nextValue: string): number {
  const trimmed = nextValue.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.invalidInteger)
  }
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.invalidInteger)
  }
  return parsed
}

function parseNumericPatch(row: ResolvedFieldRow, nextValue: string): Uint8Array {
  const parsed = parseInteger(nextValue)
  const patch = new Uint8Array(row.byteLength)

  if (row.type === 'u8') {
    if (parsed < 0 || parsed > 0xff) throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.outOfRange)
    patch[0] = parsed
    return patch
  }
  if (row.type === 's8') {
    if (parsed < -128 || parsed > 127) throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.outOfRange)
    patch[0] = parsed & 0xff
    return patch
  }
  if (row.type === 'u16') {
    if (parsed < 0 || parsed > 0xffff) throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.outOfRange)
    patch[0] = parsed & 0xff
    patch[1] = (parsed >>> 8) & 0xff
    return patch
  }
  if (parsed < 0 || parsed > 0xffffffff) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.outOfRange)
  }
  patch[0] = parsed & 0xff
  patch[1] = (parsed >>> 8) & 0xff
  patch[2] = (parsed >>> 16) & 0xff
  patch[3] = (parsed >>> 24) & 0xff
  return patch
}

function parseBytePatch(row: ResolvedFieldRow, nextValue: string): Uint8Array {
  const normalized = nextValue.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (normalized.length !== row.byteLength * 2 || /[^0-9a-f]/i.test(normalized)) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.invalidBytes)
  }

  const patch = new Uint8Array(row.byteLength)
  for (let i = 0; i < row.byteLength; i += 1) {
    patch[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  }
  return patch
}

function parseTextPatch(row: ResolvedFieldRow, nextValue: string): Uint8Array {
  const encoded = new TextEncoder().encode(nextValue)
  if (encoded.length > row.byteLength) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.textTooLong)
  }
  const patch = new Uint8Array(row.byteLength)
  patch.set(encoded)
  return patch
}

export function getStructuredRows(parsed: ParsedSaveFile, blockIndex: number): FieldRow[] {
  return getResolvedRows(parsed, blockIndex).map(({ byteLength: _byteLength, ...row }) => row)
}

export function applyStructuredEdit(
  parsed: ParsedSaveFile,
  blockIndex: number,
  rowKey: string,
  nextValue: string,
): ParsedSaveFile {
  const row = getResolvedRows(parsed, blockIndex).find((candidate) => candidate.key === rowKey)
  if (!row) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.invalidRow)
  }

  let patch: Uint8Array
  switch (row.type) {
    case 'u8':
    case 's8':
    case 'u16':
    case 'u32':
      patch = parseNumericPatch(row, nextValue)
      break
    case 'bytes':
      patch = parseBytePatch(row, nextValue)
      break
    case 'text':
      patch = parseTextPatch(row, nextValue)
      break
  }

  return updateBlockBytes(parsed, blockIndex, row.offset, patch)
}
