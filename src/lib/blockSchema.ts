import type { GameCode } from './saveCodec'

export type FieldType = 'u8' | 's8' | 'u16' | 'u32' | 'bytes' | 'text'

export type StructuredDomain = 'playState' | 'units' | 'inventory' | 'progressFlags' | 'technical'

export interface BlockFieldSchema {
  key: string
  offset: number
  size: 1 | 2 | 4
  byteLength: number
  type: FieldType
  labelKey: string
  domain: StructuredDomain
  groupKey: string
  memberPath: string
}

export const PLAYST_FIELD_SCHEMA: readonly BlockFieldSchema[] = [
  { key: 'playst.gold', offset: 0x08, size: 4, byteLength: 4, type: 'u32', labelKey: 'field.playst.gold', domain: 'playState', groupKey: 'playst', memberPath: 'gold' },
  { key: 'playst.saveSlot', offset: 0x0c, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.saveSlot', domain: 'playState', groupKey: 'playst', memberPath: 'saveSlot' },
  { key: 'playst.chapterIndex', offset: 0x0e, size: 1, byteLength: 1, type: 's8', labelKey: 'field.playst.chapterIndex', domain: 'playState', groupKey: 'playst', memberPath: 'chapterIndex' },
  { key: 'playst.chapterTurn', offset: 0x10, size: 2, byteLength: 2, type: 'u16', labelKey: 'field.playst.chapterTurn', domain: 'playState', groupKey: 'playst', memberPath: 'chapterTurn' },
  { key: 'playst.chapterStateBits', offset: 0x14, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.chapterStateBits', domain: 'playState', groupKey: 'playst', memberPath: 'chapterStateBits' },
  { key: 'playst.playthroughId', offset: 0x18, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.playthroughId', domain: 'playState', groupKey: 'playst', memberPath: 'playthroughId' },
  { key: 'playst.chapterMode', offset: 0x1b, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.playst.chapterMode', domain: 'playState', groupKey: 'playst', memberPath: 'chapterMode' },
  { key: 'playst.playerName', offset: 0x20, size: 1, byteLength: 0x0b, type: 'text', labelKey: 'field.playst.playerName', domain: 'playState', groupKey: 'playst', memberPath: 'playerName' },
] as const

const EMPTY_BLOCK_SCHEMA: readonly BlockFieldSchema[] = []
const BLOCK_SCHEMA_BY_GAME: Readonly<Record<GameCode, Readonly<Partial<Record<number, readonly BlockFieldSchema[]>>>>> = {
  FE6: {},
  FE7: {},
  FE8: {
    0: PLAYST_FIELD_SCHEMA,
    1: PLAYST_FIELD_SCHEMA,
  },
  UNKNOWN: {},
}

export function getBlockSchema(gameCode: GameCode, blockKind: number): readonly BlockFieldSchema[] {
  return BLOCK_SCHEMA_BY_GAME[gameCode][blockKind] ?? EMPTY_BLOCK_SCHEMA
}
