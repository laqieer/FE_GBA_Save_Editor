import { describe, expect, it } from 'vitest'
import { getBlockSchema } from './blockSchema'

describe('blockSchema', () => {
  it.each([
    { gameCode: 'FE6', expectedLastConvoyIndex: 99 },
    { gameCode: 'FE7', expectedLastConvoyIndex: 99 },
    { gameCode: 'FE8', expectedLastConvoyIndex: 87 },
  ] as const)(
    'exposes packed unit and convoy schema for $gameCode game-save blocks',
    ({ gameCode, expectedLastConvoyIndex }) => {
      const fields = getBlockSchema(gameCode, 0)

      expect(fields.some((field) => field.memberPath === 'units[0].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[50].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[0].items[0].itemId')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[0].items[0].uses')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'inventory.convoy[0].itemId')).toBe(true)
      expect(
        fields.some((field) => field.memberPath === `inventory.convoy[${expectedLastConvoyIndex}].uses`),
      ).toBe(true)
    },
  )

  it('uses FE6/FE7-specific packed-unit character ID layout instead of FE8 byte layout', () => {
    const fe6CharacterId = getBlockSchema('FE6', 0).find(
      (field) => field.memberPath === 'units[0].characterId',
    )
    const fe7CharacterId = getBlockSchema('FE7', 0).find(
      (field) => field.memberPath === 'units[0].characterId',
    )
    const fe8CharacterId = getBlockSchema('FE8', 0).find(
      (field) => field.memberPath === 'units[0].characterId',
    )

    expect(fe6CharacterId?.bitOffset).toBeDefined()
    expect(fe7CharacterId?.bitOffset).toBeDefined()
    expect(fe8CharacterId?.bitOffset).toBeUndefined()
    expect(fe8CharacterId?.offset).toBe(0x60)
  })

  it('uses FE6-specific game-save offset baseline and omits FE7/FE8-only play-state fields', () => {
    const fe6Fields = getBlockSchema('FE6', 0)
    const fe7Fields = getBlockSchema('FE7', 0)

    expect(fe6Fields.find((field) => field.memberPath === 'units[0].characterId')?.offset).toBe(0x20)
    expect(fe7Fields.find((field) => field.memberPath === 'units[0].characterId')?.offset).toBe(0x4c)
    expect(fe6Fields.some((field) => field.memberPath === 'playerName')).toBe(false)
    expect(fe7Fields.some((field) => field.memberPath === 'playerName')).toBe(true)
  })
})
