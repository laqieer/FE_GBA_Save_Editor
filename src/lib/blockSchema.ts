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

type PackedBitFieldSpec = Readonly<{
  key: string
  labelKey: string
  memberPath: string
  bitLength: number
}>

type UnitLayout = Readonly<{
  playStSize: number
  playStateFields: readonly BlockFieldSchema[]
  unitCount: number
  hasGmUnitBeforeSupply: boolean
  convoyItemCount: number
  convoyEncoding: 'u16Packed' | 'split'
  packedFields: readonly PackedBitFieldSpec[]
  characterIdField:
    | { kind: 'bit'; labelKey: string; memberPath: string; bitLength: number }
    | { kind: 'byte'; labelKey: string; memberPath: string; byteOffset: number }
  weaponRankOffset: number
  supportOffset: number
}>

const PACKED_UNIT_SIZE = 0x24

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

export const FE6_PLAYST_FIELD_SCHEMA: readonly BlockFieldSchema[] = [
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
] as const

export const FE7_FE8_PLAYST_FIELD_SCHEMA: readonly BlockFieldSchema[] = [
  ...FE6_PLAYST_FIELD_SCHEMA,
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

const FE6_FE7_PACKED_FIELDS: readonly PackedBitFieldSpec[] = [
  { key: 'classId', labelKey: 'field.unit.classId', memberPath: 'classId', bitLength: 7 },
  { key: 'level', labelKey: 'field.unit.level', memberPath: 'level', bitLength: 5 },
  { key: 'stateFlags', labelKey: 'field.unit.stateFlags', memberPath: 'stateFlags', bitLength: 6 },
  { key: 'exp', labelKey: 'field.unit.exp', memberPath: 'exp', bitLength: 7 },
  { key: 'positionX', labelKey: 'field.unit.positionX', memberPath: 'position.x', bitLength: 6 },
  { key: 'positionY', labelKey: 'field.unit.positionY', memberPath: 'position.y', bitLength: 6 },
  { key: 'maxHp', labelKey: 'field.unit.maxHp', memberPath: 'maxHp', bitLength: 6 },
  { key: 'strength', labelKey: 'field.unit.strength', memberPath: 'strength', bitLength: 5 },
  { key: 'skill', labelKey: 'field.unit.skill', memberPath: 'skill', bitLength: 5 },
  { key: 'speed', labelKey: 'field.unit.speed', memberPath: 'speed', bitLength: 5 },
  { key: 'defense', labelKey: 'field.unit.defense', memberPath: 'defense', bitLength: 5 },
  { key: 'resistance', labelKey: 'field.unit.resistance', memberPath: 'resistance', bitLength: 5 },
  { key: 'luck', labelKey: 'field.unit.luck', memberPath: 'luck', bitLength: 5 },
  { key: 'constitution', labelKey: 'field.unit.constitution', memberPath: 'constitution', bitLength: 5 },
  { key: 'moveBonus', labelKey: 'field.unit.moveBonus', memberPath: 'moveBonus', bitLength: 5 },
] as const

const FE8_PACKED_FIELDS: readonly PackedBitFieldSpec[] = [
  { key: 'classId', labelKey: 'field.unit.classId', memberPath: 'classId', bitLength: 7 },
  { key: 'level', labelKey: 'field.unit.level', memberPath: 'level', bitLength: 5 },
  { key: 'exp', labelKey: 'field.unit.exp', memberPath: 'exp', bitLength: 7 },
  { key: 'positionX', labelKey: 'field.unit.positionX', memberPath: 'position.x', bitLength: 6 },
  { key: 'positionY', labelKey: 'field.unit.positionY', memberPath: 'position.y', bitLength: 6 },
  { key: 'stateFlags', labelKey: 'field.unit.stateFlags', memberPath: 'stateFlags', bitLength: 13 },
  { key: 'maxHp', labelKey: 'field.unit.maxHp', memberPath: 'maxHp', bitLength: 6 },
  { key: 'strength', labelKey: 'field.unit.strength', memberPath: 'strength', bitLength: 5 },
  { key: 'skill', labelKey: 'field.unit.skill', memberPath: 'skill', bitLength: 5 },
  { key: 'speed', labelKey: 'field.unit.speed', memberPath: 'speed', bitLength: 5 },
  { key: 'defense', labelKey: 'field.unit.defense', memberPath: 'defense', bitLength: 5 },
  { key: 'resistance', labelKey: 'field.unit.resistance', memberPath: 'resistance', bitLength: 5 },
  { key: 'luck', labelKey: 'field.unit.luck', memberPath: 'luck', bitLength: 5 },
  { key: 'constitution', labelKey: 'field.unit.constitution', memberPath: 'constitution', bitLength: 5 },
  { key: 'moveBonus', labelKey: 'field.unit.moveBonus', memberPath: 'moveBonus', bitLength: 5 },
] as const

const FE6_LAYOUT: UnitLayout = {
  playStSize: 0x20,
  playStateFields: FE6_PLAYST_FIELD_SCHEMA,
  unitCount: 52,
  hasGmUnitBeforeSupply: false,
  convoyItemCount: 100,
  convoyEncoding: 'u16Packed',
  packedFields: FE6_FE7_PACKED_FIELDS,
  characterIdField: { kind: 'bit', labelKey: 'field.unit.characterId', memberPath: 'characterId', bitLength: 7 },
  weaponRankOffset: 0x16,
  supportOffset: 0x1e,
}

const FE7_LAYOUT: UnitLayout = {
  playStSize: 0x48,
  playStateFields: FE7_FE8_PLAYST_FIELD_SCHEMA,
  unitCount: 52,
  hasGmUnitBeforeSupply: false,
  convoyItemCount: 100,
  convoyEncoding: 'u16Packed',
  packedFields: FE8_PACKED_FIELDS,
  characterIdField: { kind: 'byte', labelKey: 'field.unit.characterId', memberPath: 'characterId', byteOffset: 0x14 },
  weaponRankOffset: 0x15,
  supportOffset: 0x1d,
}

const FE8_LAYOUT: UnitLayout = {
  playStSize: 0x4c,
  playStateFields: FE7_FE8_PLAYST_FIELD_SCHEMA,
  unitCount: 51,
  hasGmUnitBeforeSupply: true,
  convoyItemCount: 0x58,
  convoyEncoding: 'u16Packed',
  packedFields: FE8_PACKED_FIELDS,
  characterIdField: { kind: 'byte', labelKey: 'field.unit.characterId', memberPath: 'characterId', byteOffset: 0x14 },
  weaponRankOffset: 0x15,
  supportOffset: 0x1d,
}

function getSupplyIdBase(layout: UnitLayout): number {
  const gmUnitBytes = layout.hasGmUnitBeforeSupply ? PACKED_UNIT_SIZE : 0
  return layout.playStSize + layout.unitCount * PACKED_UNIT_SIZE + gmUnitBytes
}

function buildPackedUnitSchema(unitIndex: number, layout: UnitLayout): readonly BlockFieldSchema[] {
  const unitBase = layout.playStSize + unitIndex * PACKED_UNIT_SIZE
  const groupKey = `units.${unitIndex}`
  const memberPrefix = `units[${unitIndex}]`
  const fields: BlockFieldSchema[] = []

  let bitCursor = unitBase * 8

  if (layout.characterIdField.kind === 'bit') {
    fields.push(
      makeBitField({
        key: `unit.${unitIndex}.characterId`,
        bitOffset: bitCursor,
        bitLength: layout.characterIdField.bitLength,
        labelKey: layout.characterIdField.labelKey,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.${layout.characterIdField.memberPath}`,
      }),
    )
    bitCursor += layout.characterIdField.bitLength
  }

  for (const field of layout.packedFields) {
    fields.push(
      makeBitField({
        key: `unit.${unitIndex}.${field.key}`,
        bitOffset: bitCursor,
        bitLength: field.bitLength,
        labelKey: field.labelKey,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.${field.memberPath}`,
      }),
    )
    bitCursor += field.bitLength
  }

  for (let itemIndex = 0; itemIndex < 5; itemIndex += 1) {
    fields.push(
      makeBitField({
        key: `unit.${unitIndex}.item.${itemIndex}.itemId`,
        bitOffset: bitCursor,
        bitLength: 8,
        labelKey: 'field.unit.itemId',
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.items[${itemIndex}].itemId`,
      }),
    )
    fields.push(
      makeBitField({
        key: `unit.${unitIndex}.item.${itemIndex}.uses`,
        bitOffset: bitCursor + 8,
        bitLength: 6,
        labelKey: 'field.unit.itemUses',
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.items[${itemIndex}].uses`,
      }),
    )
    bitCursor += 14
  }

  if (layout.characterIdField.kind === 'byte') {
    fields.push(
      makeField({
        key: `unit.${unitIndex}.characterId`,
        offset: unitBase + layout.characterIdField.byteOffset,
        size: 1,
        type: 'u8',
        labelKey: layout.characterIdField.labelKey,
        domain: 'units',
        groupKey,
        memberPath: `${memberPrefix}.${layout.characterIdField.memberPath}`,
      }),
    )
  }

  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    fields.push(
      makeField({
        key: `unit.${unitIndex}.weaponRank.${rankIndex}`,
        offset: unitBase + layout.weaponRankOffset + rankIndex,
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
        offset: unitBase + layout.supportOffset + supportIndex,
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

function buildUnitSchema(layout: UnitLayout): readonly BlockFieldSchema[] {
  const rows: BlockFieldSchema[] = []
  for (let unitIndex = 0; unitIndex < layout.unitCount; unitIndex += 1) {
    rows.push(...buildPackedUnitSchema(unitIndex, layout))
  }
  return rows
}

function buildInventorySchema(layout: UnitLayout): readonly BlockFieldSchema[] {
  const rows: BlockFieldSchema[] = []
  const supplyBase = getSupplyIdBase(layout)

  for (let convoyIndex = 0; convoyIndex < layout.convoyItemCount; convoyIndex += 1) {
    if (layout.convoyEncoding === 'u16Packed') {
      const entryBitOffset = (supplyBase + convoyIndex * 2) * 8
      rows.push(
        makeBitField({
          key: `inventory.convoy.${convoyIndex}.itemId`,
          bitOffset: entryBitOffset,
          bitLength: 8,
          labelKey: 'field.inventory.convoyItemId',
          domain: 'inventory',
          groupKey: 'inventory.convoy',
          memberPath: `inventory.convoy[${convoyIndex}].itemId`,
        }),
      )
      rows.push(
        makeBitField({
          key: `inventory.convoy.${convoyIndex}.uses`,
          bitOffset: entryBitOffset + 8,
          bitLength: 6,
          labelKey: 'field.inventory.convoyUses',
          domain: 'inventory',
          groupKey: 'inventory.convoy',
          memberPath: `inventory.convoy[${convoyIndex}].uses`,
        }),
      )
      continue
    }

    rows.push(
      makeField({
        key: `inventory.convoy.${convoyIndex}.itemId`,
        offset: supplyBase + convoyIndex,
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
        bitOffset: (supplyBase + layout.convoyItemCount) * 8 + convoyIndex * 6,
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

function buildGameSaveSchema(layout: UnitLayout): readonly BlockFieldSchema[] {
  return [...layout.playStateFields, ...buildUnitSchema(layout), ...buildInventorySchema(layout)]
}

export function buildFe6SaveSchema(): readonly BlockFieldSchema[] {
  return buildGameSaveSchema(FE6_LAYOUT)
}

export function buildFe7SaveSchema(): readonly BlockFieldSchema[] {
  return buildGameSaveSchema(FE7_LAYOUT)
}

export function buildFe8SaveSchema(): readonly BlockFieldSchema[] {
  return buildGameSaveSchema(FE8_LAYOUT)
}

export const EMPTY_BLOCK_SCHEMA: readonly BlockFieldSchema[] = []
const FE6_GAME_SAVE_SCHEMA = buildFe6SaveSchema()
const FE7_GAME_SAVE_SCHEMA = buildFe7SaveSchema()
const FE8_GAME_SAVE_SCHEMA = buildFe8SaveSchema()
const SUSPEND_SCHEMA_BY_GAME: Readonly<Record<GameCode, readonly BlockFieldSchema[]>> = {
  FE6: FE6_PLAYST_FIELD_SCHEMA,
  FE7: FE7_FE8_PLAYST_FIELD_SCHEMA,
  FE8: FE7_FE8_PLAYST_FIELD_SCHEMA,
  UNKNOWN: EMPTY_BLOCK_SCHEMA,
}

const BLOCK_SCHEMA_BY_GAME: Readonly<Record<GameCode, Readonly<Partial<Record<number, readonly BlockFieldSchema[]>>>>> = {
  FE6: {
    0: FE6_GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA_BY_GAME.FE6,
  },
  FE7: {
    0: FE7_GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA_BY_GAME.FE7,
  },
  FE8: {
    0: FE8_GAME_SAVE_SCHEMA,
    1: SUSPEND_SCHEMA_BY_GAME.FE8,
  },
  UNKNOWN: {},
}

export function getBlockSchema(gameCode: GameCode, blockKind: number): readonly BlockFieldSchema[] {
  return BLOCK_SCHEMA_BY_GAME[gameCode][blockKind] ?? EMPTY_BLOCK_SCHEMA
}
