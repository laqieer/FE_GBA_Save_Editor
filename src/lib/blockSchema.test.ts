import { describe, expect, it } from 'vitest'
import { getBlockSchema } from './blockSchema'

describe('blockSchema', () => {
  it.each(['FE6', 'FE7', 'FE8'] as const)(
    'exposes packed unit and full convoy schema for %s game-save blocks',
    (gameCode) => {
      const fields = getBlockSchema(gameCode, 0)

      expect(fields.some((field) => field.memberPath === 'units[0].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'units[50].level')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'inventory.convoy[0].itemId')).toBe(true)
      expect(fields.some((field) => field.memberPath === 'inventory.convoy[99].uses')).toBe(true)
    },
  )
})
