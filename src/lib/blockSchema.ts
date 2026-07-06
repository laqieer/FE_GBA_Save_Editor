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
  bitOffset?: number
  bitLength?: number
  bitfieldPath?: string
  bitIndices?: readonly number[]
}

type BlockFieldSchemaInput = Omit<BlockFieldSchema, 'byteLength'> & { byteLength?: number }

const PLAYST_SIZE = 0x4c
const UNIT_SAVE_AMOUNT_BLUE = 51
const PACKED_UNIT_SIZE = 0x24
const GAME_SAVE_GM_UNIT_SIZE = 0x24
const GAME_SAVE_UNIT_BASE = PLAYST_SIZE
const GAME_SAVE_SUPPLY_BASE =
  GAME_SAVE_UNIT_BASE + UNIT_SAVE_AMOUNT_BLUE * PACKED_UNIT_SIZE + GAME_SAVE_GM_UNIT_SIZE
const CONVOY_ITEM_COUNT = 100
const CONVOY_ITEM_ID_BASE = GAME_SAVE_SUPPLY_BASE
const CONVOY_ITEM_USES_BIT_BASE = (GAME_SAVE_SUPPLY_BASE + CONVOY_ITEM_COUNT) * 8

function makeField(field: BlockFieldSchemaInput): BlockFieldSchema {
  return {
    ...field,
    byteLength: field.byteLength ?? field.size,
  }
}

function makeBitField(
  field: Omit<BlockFieldSchemaInput, 'offset' | 'size' | 'type'> & {
    bitOffset: number
    bitLength: number
  },
): BlockFieldSchema {
  const bitStart = field.bitOffset
  const bitEnd = field.bitOffset + field.bitLength
  const byteStart = Math.floor(bitStart / 8)
  const byteEnd = Math.ceil(bitEnd / 8)
  return makeField({
    ...field,
    offset: byteStart,
    size: 4,
    byteLength: byteEnd - byteStart,
    type: 'u32',
  })
}

export const PLAYST_FIELD_SCHEMA: readonly BlockFieldSchema[] = [
  makeField({
    key: 'playst.gold',
    offset: 0x08,
    size: 4,
    type: 'u32',
    labelKey: 'field.playst.gold',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'gold',
  }),
  makeField({
    key: 'playst.saveSlot',
    offset: 0x0c,
    size: 1,
    type: 'u8',
    labelKey: 'field.playst.saveSlot',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'saveSlot',
  }),
  makeField({
    key: 'playst.chapterIndex',
    offset: 0x0e,
    size: 1,
    type: 's8',
    labelKey: 'field.playst.chapterIndex',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'chapterIndex',
  }),
  makeField({
    key: 'playst.chapterTurn',
    offset: 0x10,
    size: 2,
    type: 'u16',
    labelKey: 'field.playst.chapterTurn',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'chapterTurn',
  }),
  makeField({
    key: 'playst.chapterStateBits',
    offset: 0x14,
    size: 1,
    type: 'u8',
    labelKey: 'field.playst.chapterStateBits',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'chapterStateBits',
  }),
  makeField({
    key: 'playst.playthroughId',
    offset: 0x18,
    size: 1,
    type: 'u8',
    labelKey: 'field.playst.playthroughId',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'playthroughId',
  }),
  makeField({
    key: 'playst.chapterMode',
    offset: 0x1b,
    size: 1,
    type: 'u8',
    labelKey: 'field.playst.chapterMode',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'chapterMode',
  }),
  makeField({
    key: 'playst.playerName',
    offset: 0x20,
    size: 1,
    byteLength: 0x0b,
    type: 'text',
    labelKey: 'field.playst.playerName',
    domain: 'playState',
    groupKey: 'playst',
    memberPath: 'playerName',
  }),
] as const

type PackedBitFieldSpec = Readonly<{
  key: string
  labelKey: string
  member: string
  bitLength: number
}>

const PACKED_UNIT_FIELDS: readonly PackedBitFieldSpec[] = [
  { key: 'classId', labelKey: 'field.unit.classId', member: 'classId', bitLength: 7 },
  { key: 'level', labelKey: 'field.unit.level', member: 'level', bitLength: 5 },
  { key: 'exp', labelKey: 'field.unit.exp', member: 'exp', bitLength: 7 },
  { key: 'positionX', labelKey: 'field.unit.positionX', member: 'position.x', bitLength: 6 },
  { key: 'positionY', labelKey: 'field.unit.positionY', member: 'position.y', bitLength: 6 },
  { key: 'stateFlags', labelKey: 'field.unit.stateFlags', member: 'stateFlags', bitLength: 13 },
  { key: 'maxHp', labelKey: 'field.unit.maxHp', member: 'maxHp', bitLength: 6 },
  { key: 'strength', labelKey: 'field.unit.strength', member: 'strength', bitLength: 5 },
  { key: 'skill', labelKey: 'field.unit.skill', member: 'skill', bitLength: 5 },
  { key: 'speed', labelKey: 'field.unit.speed', member: 'speed', bitLength: 5 },
  { key: 'defense', labelKey: 'field.unit.defense', member: 'defense', bitLength: 5 },
  { key: 'resistance', labelKey: 'field.unit.resistance', member: 'resistance', bitLength: 5 },
  { key: 'luck', labelKey: 'field.unit.luck', member: 'luck', bitLength: 5 },
  { key: 'constitution', labelKey: 'field.unit.constitution', member: 'constitution', bitLength: 5 },
  { key: 'moveBonus', labelKey: 'field.unit.moveBonus', member: 'moveBonus', bitLength: 5 },
  { key: 'item1', labelKey: 'field.unit.item1', member: 'items[0]', bitLength: 14 },
  { key: 'item2', labelKey: 'field.unit.item2', member: 'items[1]', bitLength: 14 },
  { key: 'item3', labelKey: 'field.unit.item3', member: 'items[2]', bitLength: 14 },
  { key: 'item4', labelKey: 'field.unit.item4', member: 'items[3]', bitLength: 14 },
  { key: 'item5', labelKey: 'field.unit.item5', member: 'items[4]', bitLength: 14 },
] as const

function buildPackedUnitSchema(unitIndex: number): readonly BlockFieldSchema[] {
  const unitBase = GAME_SAVE_UNIT_BASE + unitIndex * PACKED_UNIT_SIZE
  const groupKey = `units.${unitIndex}`
  const memberPrefix = `units[${unitIndex}]`
  const fields: BlockFieldSchema[] = []

  let bitCursor = unitBase * 8
  for (const field of PACKED_UNIT_FIELDS) {
    fields.push(
      makeBitField({
        key: `unit.${unitIndex}.${field.key}`,
        bitOffset: bitCursor,
        bitLength: field.bitLength,
        labelKey: field.labelKey,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.${field.member}`,
      }),
    )
    bitCursor += field.bitLength
  }

  fields.push(
    makeField({
      key: `unit.${unitIndex}.characterId`,
      offset: unitBase + 0x14,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.characterId',
      domain: 'units',
      groupKey,
      memberPath: `${memberPrefix}.characterId`,
    }),
  )

  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    fields.push(
      makeField({
        key: `unit.${unitIndex}.weaponRank.${rankIndex}`,
        offset: unitBase + 0x15 + rankIndex,
        size: 1,
        type: 'u8',
        labelKey: `field.unit.weaponRank.${rankIndex}`,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.weaponRanks[${rankIndex}]`,
      }),
    )
  }

  for (let supportIndex = 0; supportIndex < 7; supportIndex += 1) {
    fields.push(
      makeField({
        key: `unit.${unitIndex}.support.${supportIndex}`,
        offset: unitBase + 0x1d + supportIndex,
        size: 1,
        type: 'u8',
        labelKey: `field.unit.support.${supportIndex}`,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.supports[${supportIndex}]`,
      }),
    )
  }

  return fields
}

function buildUnitSchema(): readonly BlockFieldSchema[] {
  const rows: BlockFieldSchema[] = []
  for (let unitIndex = 0; unitIndex < UNIT_SAVE_AMOUNT_BLUE; unitIndex += 1) {
    rows.push(...buildPackedUnitSchema(unitIndex))
  }
  return rows
}

export function buildFe8InventorySchema(): readonly BlockFieldSchema[] {
  const rows: BlockFieldSchema[] = []
  for (let convoyIndex = 0; convoyIndex < CONVOY_ITEM_COUNT; convoyIndex += 1) {
    rows.push(
      makeField({
        key: `inventory.convoy.${convoyIndex}.itemId`,
        offset: CONVOY_ITEM_ID_BASE + convoyIndex,
        size: 1,
        type: 'u8',
        labelKey: 'field.inventory.convoyItemId',
        domain: 'inventory',
        groupKey: 'inventory.convoy',
        memberPath: `inventory.convoy[${convoyIndex}].itemId`,
      }),
    )

    rows.push(
      makeBitField({
        key: `inventory.convoy.${convoyIndex}.uses`,
        bitOffset: CONVOY_ITEM_USES_BIT_BASE + convoyIndex * 6,
        bitLength: 6,
        labelKey: 'field.inventory.convoyUses',
        domain: 'inventory',
        groupKey: 'inventory.convoy',
        memberPath: `inventory.convoy[${convoyIndex}].uses`,
      }),
    )
  }
  return rows
}

export function buildFe8SaveSchema(): readonly BlockFieldSchema[] {
  return [...PLAYST_FIELD_SCHEMA, ...buildUnitSchema(), ...buildFe8InventorySchema()]
}

export const EMPTY_BLOCK_SCHEMA: readonly BlockFieldSchema[] = []
const GAME_SAVE_SCHEMA = buildFe8SaveSchema()
const SUSPEND_SCHEMA = PLAYST_FIELD_SCHEMA

const BLOCK_SCHEMA_BY_GAME: Readonly<Record<GameCode, Readonly<Partial<Record<number, readonly BlockFieldSchema[]>>>>> = {
  FE6: {
    0: GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA,
  },
  FE7: {
    0: GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA,
  },
  FE8: {
    0: GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA,
  },
  UNKNOWN: {},
}

export function buildFe6SaveSchema(): readonly BlockFieldSchema[] {
  return GAME_SAVE_SCHEMA
}

export function buildFe7SaveSchema(): readonly BlockFieldSchema[] {
  return GAME_SAVE_SCHEMA
}

export function getBlockSchema(gameCode: GameCode, blockKind: number): readonly BlockFieldSchema[] {
  return BLOCK_SCHEMA_BY_GAME[gameCode][blockKind] ?? EMPTY_BLOCK_SCHEMA
}
