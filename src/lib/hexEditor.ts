import { updateBlockBytes, type ParsedSaveFile } from './saveCodec'

export type HexRow = {
  rowOffset: number
  hex: string[]
  ascii: string
}

const DEFAULT_BYTES_PER_ROW = 16
export const DEFAULT_HEX_PAGE_SIZE = 16
const HEX_PAIR = /^[0-9a-fA-F]{2}$/

function toHexPair(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

function toAsciiChar(value: number): string {
  return value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : '.'
}

export function toHexRows(blockBytes: Uint8Array, bytesPerRow = DEFAULT_BYTES_PER_ROW): HexRow[] {
  if (!Number.isInteger(bytesPerRow) || bytesPerRow <= 0) {
    throw new Error('Invalid bytes per row')
  }

  const rows: HexRow[] = []

  for (let rowOffset = 0; rowOffset < blockBytes.length; rowOffset += bytesPerRow) {
    const rowBytes = blockBytes.slice(rowOffset, rowOffset + bytesPerRow)
    rows.push({
      rowOffset,
      hex: Array.from(rowBytes, toHexPair),
      ascii: Array.from(rowBytes, toAsciiChar).join(''),
    })
  }

  return rows
}

function validatePageSize(pageSize: number) {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('Invalid page size')
  }
}

export function getHexPageCount(totalRows: number, pageSize = DEFAULT_HEX_PAGE_SIZE): number {
  validatePageSize(pageSize)
  return Math.max(1, Math.ceil(totalRows / pageSize))
}

export function getHexPageRows(
  rows: readonly HexRow[],
  pageIndex: number,
  pageSize = DEFAULT_HEX_PAGE_SIZE,
): HexRow[] {
  validatePageSize(pageSize)
  const maxPageIndex = getHexPageCount(rows.length, pageSize) - 1
  const clampedPageIndex = Math.min(Math.max(pageIndex, 0), maxPageIndex)
  const start = clampedPageIndex * pageSize
  return rows.slice(start, start + pageSize)
}

export function applyHexEdit(
  parsed: ParsedSaveFile,
  blockIndex: number,
  absoluteByteOffset: number,
  nextHexPair: string,
): ParsedSaveFile {
  if (!HEX_PAIR.test(nextHexPair)) {
    throw new Error('Invalid hex byte')
  }

  return updateBlockBytes(
    parsed,
    blockIndex,
    absoluteByteOffset,
    Uint8Array.from([Number.parseInt(nextHexPair, 16)]),
  )
}
