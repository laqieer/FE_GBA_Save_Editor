import { describe, expect, it } from 'vitest'
import { getBlockSchema } from './blockSchema'

describe('blockSchema', () => {
  it.each(['FE6', 'FE7', 'FE8'] as const)(
    'exposes packed unit and full convoy schema for %s game-save blocks',
    (gameCode) => {
      const fields = getBlockSchema(gameCode, 0)

      expect(fields.some((field) => field.memberPath === 'units[0].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[50].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[0].items[0].itemId')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[0].items[0].uses')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'inventory.convoy[0].itemId')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'inventory.convoy[99].uses')).toBe(true)
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
})
