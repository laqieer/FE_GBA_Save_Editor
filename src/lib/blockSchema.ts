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

type BlockFieldSchemaInput = Omit<BlockFieldSchema, 'byteLength'> & { byteLength?: number }

function makeField(field: BlockFieldSchemaInput): BlockFieldSchema {
  return {
    ...field,
    byteLength: field.byteLength ?? field.size,
  }
}

function createTechnicalLabel(memberPath: string): string {
  return `field.tech.${memberPath.replace(/[.[\]]+/g, '_').replace(/_+$/, '')}`
}

function makeTechnicalField(field: Omit<BlockFieldSchemaInput, 'labelKey'>): BlockFieldSchema {
  return makeField({
    ...field,
    labelKey: createTechnicalLabel(field.memberPath),
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

export function buildFe8UnitSchema(): readonly BlockFieldSchema[] {
  return [
    makeField({
      key: 'unit.0.characterId',
      offset: 0x30,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.characterId',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].characterId',
    }),
    makeField({
      key: 'unit.0.classId',
      offset: 0x31,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.classId',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].classId',
    }),
    makeField({
      key: 'unit.0.level',
      offset: 0x32,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.level',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].level',
    }),
    makeField({
      key: 'unit.0.exp',
      offset: 0x33,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.exp',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].exp',
    }),
    makeField({
      key: 'unit.0.currentHp',
      offset: 0x34,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.currentHp',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].currentHp',
    }),
    makeField({
      key: 'unit.0.maxHp',
      offset: 0x35,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.maxHp',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].maxHp',
    }),
    makeField({
      key: 'unit.0.strength',
      offset: 0x36,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.strength',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].strength',
    }),
    makeField({
      key: 'unit.0.skill',
      offset: 0x37,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.skill',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].skill',
    }),
    makeField({
      key: 'unit.0.speed',
      offset: 0x38,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.speed',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].speed',
    }),
    makeField({
      key: 'unit.0.defense',
      offset: 0x39,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.defense',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].defense',
    }),
    makeField({
      key: 'unit.0.resistance',
      offset: 0x3a,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.resistance',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].resistance',
    }),
    makeField({
      key: 'unit.0.luck',
      offset: 0x3b,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.luck',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].luck',
    }),
    makeField({
      key: 'unit.0.constitution',
      offset: 0x3c,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.constitution',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].constitution',
    }),
    makeField({
      key: 'unit.0.positionX',
      offset: 0x3d,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.positionX',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].position.x',
    }),
    makeField({
      key: 'unit.0.positionY',
      offset: 0x3e,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.positionY',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].position.y',
    }),
    makeField({
      key: 'unit.0.status',
      offset: 0x3f,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.status',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].status',
    }),
    makeField({
      key: 'unit.0.affiliation',
      offset: 0x40,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.affiliation',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].affiliation',
    }),
    makeField({
      key: 'unit.0.aiFlags',
      offset: 0x41,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.aiFlags',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].aiFlags',
    }),
    makeField({
      key: 'unit.0.rescueTarget',
      offset: 0x42,
      size: 1,
      type: 'u8',
      labelKey: 'field.unit.rescueTarget',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].rescueTarget',
    }),
  ] as const
}

export function buildFe8InventorySchema(): readonly BlockFieldSchema[] {
  return [
    makeField({
      key: 'inventory.convoy.0.itemId',
      offset: 0x48,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyItemId',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[0].itemId',
    }),
    makeField({
      key: 'inventory.convoy.0.uses',
      offset: 0x49,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyUses',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[0].uses',
    }),
    makeField({
      key: 'inventory.convoy.1.itemId',
      offset: 0x4a,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyItemId',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[1].itemId',
    }),
    makeField({
      key: 'inventory.convoy.1.uses',
      offset: 0x4b,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyUses',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[1].uses',
    }),
    makeField({
      key: 'inventory.convoy.2.itemId',
      offset: 0x4c,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyItemId',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[2].itemId',
    }),
    makeField({
      key: 'inventory.convoy.2.uses',
      offset: 0x4d,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyUses',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[2].uses',
    }),
    makeField({
      key: 'inventory.convoy.3.itemId',
      offset: 0x4e,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyItemId',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[3].itemId',
    }),
    makeField({
      key: 'inventory.convoy.3.uses',
      offset: 0x4f,
      size: 1,
      type: 'u8',
      labelKey: 'field.inventory.convoyUses',
      domain: 'inventory',
      groupKey: 'inventory.convoy',
      memberPath: 'inventory.convoy[3].uses',
    }),
  ] as const
}

export function buildFe8ProgressSchema(): readonly BlockFieldSchema[] {
  return [
    makeField({
      key: 'progress.chapterState',
      offset: 0x58,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.chapterState',
      domain: 'progressFlags',
      groupKey: 'progressFlags.chapter',
      memberPath: 'progressFlags.chapterState',
    }),
    makeField({
      key: 'progress.storyFlags',
      offset: 0x59,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.storyFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.chapter',
      memberPath: 'progressFlags.storyFlags',
    }),
    makeField({
      key: 'progress.routeFlags',
      offset: 0x5a,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.routeFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.chapter',
      memberPath: 'progressFlags.routeFlags',
    }),
    makeField({
      key: 'progress.supportRankBits',
      offset: 0x5b,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.supportRankBits',
      domain: 'progressFlags',
      groupKey: 'progressFlags.support',
      memberPath: 'progressFlags.supportRankBits',
    }),
    makeField({
      key: 'progress.playthroughFlags',
      offset: 0x5c,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.playthroughFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.support',
      memberPath: 'progressFlags.playthroughFlags',
    }),
    makeField({
      key: 'progress.worldEventFlags',
      offset: 0x5d,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.worldEventFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.world',
      memberPath: 'progressFlags.worldEventFlags',
    }),
    makeField({
      key: 'progress.tutorialFlags',
      offset: 0x5e,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.tutorialFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.world',
      memberPath: 'progressFlags.tutorialFlags',
    }),
    makeField({
      key: 'progress.arenaFlags',
      offset: 0x5f,
      size: 1,
      type: 'u8',
      labelKey: 'field.progress.arenaFlags',
      domain: 'progressFlags',
      groupKey: 'progressFlags.world',
      memberPath: 'progressFlags.arenaFlags',
    }),
  ] as const
}

function buildLegacyUnitSchema(): readonly BlockFieldSchema[] {
  return [
    ...buildFe8UnitSchema(),
    makeTechnicalField({
      key: 'unit.0.raw43',
      offset: 0x43,
      size: 1,
      type: 'u8',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].raw_43',
    }),
    makeTechnicalField({
      key: 'unit.0.raw44',
      offset: 0x44,
      size: 2,
      type: 'u16',
      domain: 'units',
      groupKey: 'units.0',
      memberPath: 'units[0].raw_44',
    }),
  ] as const
}

export function buildFe6SaveSchema(): readonly BlockFieldSchema[] {
  return [...PLAYST_FIELD_SCHEMA, ...buildLegacyUnitSchema()]
}

export function buildFe7SaveSchema(): readonly BlockFieldSchema[] {
  return [...PLAYST_FIELD_SCHEMA, ...buildLegacyUnitSchema()]
}

const EMPTY_BLOCK_SCHEMA: readonly BlockFieldSchema[] = []
const FE8_BLOCK_SCHEMA: readonly BlockFieldSchema[] = [
  ...PLAYST_FIELD_SCHEMA,
  ...buildFe8UnitSchema(),
  ...buildFe8InventorySchema(),
  ...buildFe8ProgressSchema(),
]
const FE6_BLOCK_SCHEMA: readonly BlockFieldSchema[] = buildFe6SaveSchema()
const FE7_BLOCK_SCHEMA: readonly BlockFieldSchema[] = buildFe7SaveSchema()
const BLOCK_SCHEMA_BY_GAME: Readonly<Record<GameCode, Readonly<Partial<Record<number, readonly BlockFieldSchema[]>>>>> = {
  FE6: {
    0: FE6_BLOCK_SCHEMA,
    1: FE6_BLOCK_SCHEMA,
  },
  FE7: {
    0: FE7_BLOCK_SCHEMA,
    1: FE7_BLOCK_SCHEMA,
  },
  FE8: {
    0: FE8_BLOCK_SCHEMA,
    1: FE8_BLOCK_SCHEMA,
  },
  UNKNOWN: {},
}

export function getBlockSchema(gameCode: GameCode, blockKind: number): readonly BlockFieldSchema[] {
  return BLOCK_SCHEMA_BY_GAME[gameCode][blockKind] ?? EMPTY_BLOCK_SCHEMA
}
