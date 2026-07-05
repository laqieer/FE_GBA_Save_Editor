import type { GameCode } from './saveCodec'

export type FieldType = 'u8' | 's8' | 'u16' | 'u32' | 'bytes' | 'text'

export interface BlockFieldSchema {
  key: string
  offset: number
  size: 1 | 2 | 4
  byteLength: number
  type: FieldType
  labelKey: string
}

export const PLAYST_FIELD_SCHEMA: readonly BlockFieldSchema[] = [
  { key: 'playst.gold', offset: 0x08, size: 4, byteLength: 4, type: 'u32', labelKey: 'field.playst.gold' },
  { key: 'playst.saveSlot', offset: 0x0c, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.saveSlot' },
  { key: 'playst.chapterIndex', offset: 0x0e, size: 1, byteLength: 1, type: 's8', labelKey: 'field.playst.chapterIndex' },
  { key: 'playst.chapterTurn', offset: 0x10, size: 2, byteLength: 2, type: 'u16', labelKey: 'field.playst.chapterTurn' },
  { key: 'playst.chapterStateBits', offset: 0x14, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.chapterStateBits' },
  { key: 'playst.playthroughId', offset: 0x18, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.playthroughId' },
  { key: 'playst.chapterMode', offset: 0x1b, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.chapterMode' },
  { key: 'playst.playerName', offset: 0x20, size: 1, byteLength: 0x0b, type: 'text', labelKey: 'field.playst.playerName' },
] as const

const EMPTY_BLOCK_SCHEMA: readonly BlockFieldSchema[] = []

export function getBlockSchema(gameCode: GameCode, blockKind: number): readonly BlockFieldSchema[] {
  if (gameCode === 'UNKNOWN') {
    return EMPTY_BLOCK_SCHEMA
  }
  if (blockKind === 0 || blockKind === 1) {
    return PLAYST_FIELD_SCHEMA
  }
  return EMPTY_BLOCK_SCHEMA
}
