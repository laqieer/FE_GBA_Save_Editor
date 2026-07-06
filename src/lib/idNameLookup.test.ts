import { describe, expect, it } from 'vitest'
import { resolveIdDisplayName } from './idNameLookup'

describe('resolveIdDisplayName', () => {
  it('returns FE6/FE7/FE8 names for character, class, and item IDs', () => {
    expect(resolveIdDisplayName('FE6', 'character', 1)).toBe('Roy')
    expect(resolveIdDisplayName('FE7', 'class', 42)).toBe('Paladin')
    expect(resolveIdDisplayName('FE8', 'item', 1)).toBe('Iron Sword')
  })

  it('returns null for unknown game or unmapped IDs', () => {
    expect(resolveIdDisplayName('UNKNOWN', 'character', 1)).toBeNull()
    expect(resolveIdDisplayName('FE8', 'character', 0xff)).toBeNull()
  })
})
