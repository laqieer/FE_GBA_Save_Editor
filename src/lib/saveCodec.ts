export type GameCode = 'FE6' | 'FE7' | 'FE8' | 'UNKNOWN'

export interface PlayState {
  gold: number
  chapterIndex: number
  chapterTurn: number
  playthroughId: number
  chapterMode: number
  chapterStateBits: number
  saveSlot: number
  playerName: string
}

export interface SaveBlockView {
  index: number
  kind: number
  offset: number
  size: number
  magic32: number
  magic16: number
  checksum32: number
  checksumComputed: number
  checksumValid: boolean
  playState?: PlayState
}

export interface ParsedSaveFile {
  fileName: string
  metadataName: string
  gameCode: GameCode
  generalChecksumValid: boolean
  blocks: SaveBlockView[]
  bytes: Uint8Array
}

export interface PlayStatePatch {
  gold?: number
  chapterIndex?: number
  chapterTurn?: number
  saveSlot?: number
  playerName?: string
}

export const SAVE_CODEC_ERROR_KEYS = {
  invalidBlock: 'saveCodec.invalidBlock',
  patchOutOfRange: 'saveCodec.patchOutOfRange',
} as const

const BLOCK_INFO_START = 0x64
const BLOCK_INFO_COUNT = 7
const BLOCK_INFO_SIZE = 0x10
const GENERAL_CHECKSUM_OFFSET = 0x60
const GENERAL_CHECKSUM_SIZE = 0x50
const PLAYST_OFFSET = 0
const SPS_HEADER = 'SharkPortSave'
const SPS_HEADER_SIZE = 0x1c
const SPS_HEADER_TAG_SIZE = 4
const SPS_SENTINEL = 0x000f0000

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function writeU16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0
}

function writeU32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function readI8(bytes: Uint8Array, offset: number): number {
  const v = bytes[offset]
  return v > 127 ? v - 256 : v
}

function readFixedString(bytes: Uint8Array, offset: number, size: number): string {
  const chars: number[] = []
  for (let i = 0; i < size; i += 1) {
    const v = bytes[offset + i]
    if (v === 0) break
    chars.push(v)
  }
  return new TextDecoder().decode(new Uint8Array(chars))
}

function writeFixedString(bytes: Uint8Array, offset: number, size: number, value: string) {
  const encoded = new TextEncoder().encode(value)
  for (let i = 0; i < size; i += 1) {
    bytes[offset + i] = encoded[i] ?? 0
  }
}

function computeSharkPortChecksum(bytes: Uint8Array): number {
  let checksum = 0
  for (let i = 0; i < bytes.length; i += 1) {
    checksum = (checksum + (bytes[i] << (checksum % 24))) >>> 0
  }
  return checksum >>> 0
}

export function computeChecksum16(data: Uint8Array): number {
  let addAcc = 0
  let xorAcc = 0
  for (let i = 0; i < data.length; i += 2) {
    const v = data[i] | ((data[i + 1] ?? 0) << 8)
    addAcc += v
    xorAcc ^= v
  }
  return (addAcc + xorAcc) & 0xffff
}

export function computeChecksum32(data: Uint8Array): number {
  let addAcc = 0
  let xorAcc = 0
  for (let i = 0; i < data.length; i += 2) {
    const v = data[i] | ((data[i + 1] ?? 0) << 8)
    addAcc += v
    xorAcc ^= v
  }
  return ((addAcc & 0xffff) | ((xorAcc & 0xffff) << 16)) >>> 0
}

function deriveGameCode(metadataName: string): GameCode {
  if (metadataName.includes('FE6')) return 'FE6'
  if (metadataName.includes('FE7')) return 'FE7'
  if (metadataName.includes('FE8') || metadataName.includes('FE9')) return 'FE8'
  return 'UNKNOWN'
}

export function decodeSpsBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length < SPS_HEADER_TAG_SIZE) {
    throw new Error('Malformed .sps save file')
  }

  let cursor = 0
  const headerLength = readU32(bytes, cursor)
  cursor += SPS_HEADER_TAG_SIZE
  if (headerLength !== SPS_HEADER.length || cursor + headerLength + SPS_HEADER_TAG_SIZE > bytes.length) {
    throw new Error('Malformed .sps save file')
  }

  const headerName = new TextDecoder().decode(bytes.slice(cursor, cursor + headerLength))
  cursor += headerLength
  if (headerName !== SPS_HEADER) {
    throw new Error('Malformed .sps save file')
  }

  const sentinel = readU32(bytes, cursor)
  cursor += SPS_HEADER_TAG_SIZE
  if (sentinel !== SPS_SENTINEL) {
    throw new Error('Malformed .sps save file')
  }

  for (let i = 0; i < 3; i += 1) {
    if (cursor + SPS_HEADER_TAG_SIZE > bytes.length) {
      throw new Error('Malformed .sps save file')
    }
    const size = readU32(bytes, cursor)
    cursor += SPS_HEADER_TAG_SIZE
    if (size < 0 || cursor + size > bytes.length) {
      throw new Error('Malformed .sps save file')
    }
    cursor += size
  }

  if (cursor + SPS_HEADER_TAG_SIZE > bytes.length) {
    throw new Error('Malformed .sps save file')
  }

  const totalSize = readU32(bytes, cursor)
  cursor += SPS_HEADER_TAG_SIZE
  if (totalSize < SPS_HEADER_SIZE || cursor + totalSize + SPS_HEADER_TAG_SIZE !== bytes.length) {
    throw new Error('Malformed .sps save file')
  }

  const container = bytes.slice(cursor, cursor + totalSize)
  if (container.length !== totalSize) {
    throw new Error('Malformed .sps save file')
  }

  const checksumOffset = cursor + totalSize
  const checksum = readU32(bytes, checksumOffset)
  const checksumComputed = computeSharkPortChecksum(container)
  if (checksum !== checksumComputed) {
    throw new Error('Malformed .sps save file')
  }

  return container.slice(SPS_HEADER_SIZE)
}

export function normalizeSaveBytes(fileName: string, bytes: Uint8Array): Uint8Array {
  if (/\.sps$/i.test(fileName)) {
    return decodeSpsBytes(bytes)
  }
  return bytes
}

function parsePlayState(bytes: Uint8Array, base: number, size: number): PlayState | undefined {
  if (size < 0x4b) {
    return undefined
  }

  const p = base + PLAYST_OFFSET
  return {
    gold: readU32(bytes, p + 0x08),
    saveSlot: bytes[p + 0x0c],
    chapterIndex: readI8(bytes, p + 0x0e),
    chapterTurn: readU16(bytes, p + 0x10),
    chapterStateBits: bytes[p + 0x14],
    playthroughId: bytes[p + 0x18],
    chapterMode: bytes[p + 0x1b],
    playerName: readFixedString(bytes, p + 0x20, 0x0b),
  }
}

function isPresentBlock(block: Pick<SaveBlockView, 'kind' | 'magic32' | 'offset' | 'size'>, byteLength: number) {
  return (
    block.size > 0 &&
    block.offset > 0 &&
    block.offset + block.size <= byteLength &&
    block.magic32 !== 0 &&
    block.kind !== 0xff
  )
}

function parseFromBytes(fileName: string, bytes: Uint8Array): ParsedSaveFile {
  const metadataName = readFixedString(bytes, 0, 8)
  const metadataChecksum = readU16(bytes, GENERAL_CHECKSUM_OFFSET)
  const metadataComputed = computeChecksum16(bytes.slice(0, GENERAL_CHECKSUM_SIZE))
  const blocks: SaveBlockView[] = []

  for (let i = 0; i < BLOCK_INFO_COUNT; i += 1) {
    const o = BLOCK_INFO_START + i * BLOCK_INFO_SIZE
    const magic32 = readU32(bytes, o)
    const magic16 = readU16(bytes, o + 4)
    const kind = bytes[o + 6]
    const offset = readU16(bytes, o + 8)
    const size = readU16(bytes, o + 0x0a)
    const checksum32 = readU32(bytes, o + 0x0c)

    let checksumComputed = 0
    let checksumValid = false
    let playState: PlayState | undefined

    if (isPresentBlock({ kind, magic32, offset, size }, bytes.length)) {
      const body = bytes.slice(offset, offset + size)
      checksumComputed = computeChecksum32(body)
      checksumValid = checksumComputed === checksum32
      if (kind === 0 || kind === 1) {
        playState = parsePlayState(bytes, offset, size)
      }
    }

    blocks.push({
      index: i,
      kind,
      offset,
      size,
      magic32,
      magic16,
      checksum32,
      checksumComputed,
      checksumValid,
      playState,
    })
  }

  return {
    fileName,
    metadataName,
    gameCode: deriveGameCode(metadataName),
    generalChecksumValid: metadataChecksum === metadataComputed,
    blocks,
    bytes,
  }
}

export async function parseSaveFile(file: File): Promise<ParsedSaveFile> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return parseFromBytes(file.name, normalizeSaveBytes(file.name, bytes))
}

export function readBlockBytes(parsed: ParsedSaveFile, blockIndex: number): Uint8Array {
  const block = parsed.blocks[blockIndex]
  if (!block || !isPresentBlock(block, parsed.bytes.length)) {
    throw new Error(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  }
  return parsed.bytes.slice(block.offset, block.offset + block.size)
}

export function updateBlockBytes(
  parsed: ParsedSaveFile,
  blockIndex: number,
  offsetInBlock: number,
  patch: Uint8Array,
): ParsedSaveFile {
  const block = parsed.blocks[blockIndex]
  if (!block || !isPresentBlock(block, parsed.bytes.length)) {
    throw new Error(SAVE_CODEC_ERROR_KEYS.invalidBlock)
  }
  if (
    !Number.isFinite(offsetInBlock) ||
    !Number.isInteger(offsetInBlock) ||
    offsetInBlock < 0 ||
    offsetInBlock + patch.length > block.size
  ) {
    throw new Error(SAVE_CODEC_ERROR_KEYS.patchOutOfRange)
  }

  const bytes = parsed.bytes.slice()
  bytes.set(patch, block.offset + offsetInBlock)

  const blockBody = bytes.slice(block.offset, block.offset + block.size)
  writeU32(
    bytes,
    BLOCK_INFO_START + blockIndex * BLOCK_INFO_SIZE + 0x0c,
    computeChecksum32(blockBody),
  )
  writeU16(
    bytes,
    GENERAL_CHECKSUM_OFFSET,
    computeChecksum16(bytes.slice(0, GENERAL_CHECKSUM_SIZE)),
  )

  return parseFromBytes(parsed.fileName, bytes)
}

export function updatePlayState(
  parsed: ParsedSaveFile,
  blockIndex: number,
  patch: PlayStatePatch,
): ParsedSaveFile {
  const block = parsed.blocks[blockIndex]
  if (!block || !block.playState) {
    throw new Error('Selected block is not editable.')
  }

  const bytes = parsed.bytes.slice()
  const p = block.offset + PLAYST_OFFSET

  if (patch.gold !== undefined) {
    writeU32(bytes, p + 0x08, Math.max(0, patch.gold) >>> 0)
  }
  if (patch.saveSlot !== undefined) {
    bytes[p + 0x0c] = patch.saveSlot & 0xff
  }
  if (patch.chapterIndex !== undefined) {
    bytes[p + 0x0e] = patch.chapterIndex & 0xff
  }
  if (patch.chapterTurn !== undefined) {
    writeU16(bytes, p + 0x10, patch.chapterTurn & 0xffff)
  }
  if (patch.playerName !== undefined) {
    writeFixedString(bytes, p + 0x20, 0x0b, patch.playerName)
  }

  const blockBody = bytes.slice(block.offset, block.offset + block.size)
  writeU32(
    bytes,
    BLOCK_INFO_START + blockIndex * BLOCK_INFO_SIZE + 0x0c,
    computeChecksum32(blockBody),
  )
  writeU16(
    bytes,
    GENERAL_CHECKSUM_OFFSET,
    computeChecksum16(bytes.slice(0, GENERAL_CHECKSUM_SIZE)),
  )

  return parseFromBytes(parsed.fileName, bytes)
}

export function serializeSaveFile(parsed: ParsedSaveFile): Uint8Array {
  return parsed.bytes.slice()
}
