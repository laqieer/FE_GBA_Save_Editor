import { describe, it, expect } from 'vitest'
import { parsePageJump, clampPageIndex, findUnitPageByIndex } from './structuredNavigation'
import type { StructuredDomainSection } from './structuredTableLayout'

describe('structuredNavigation', () => {
  it('parses 1-based page input and clamps later through caller', () => {
    expect(parsePageJump('3', 10)).toBe(2)
    expect(parsePageJump(' 1 ', 10)).toBe(0)
    expect(parsePageJump('abc', 10)).toBeNull()
  })

  it('clamps page index to valid range', () => {
    expect(clampPageIndex(5, 10)).toBe(5)
    expect(clampPageIndex(-2, 10)).toBe(0)
    expect(clampPageIndex(100, 10)).toBe(9)
    expect(clampPageIndex(0.9, 10)).toBe(0)
    expect(clampPageIndex(2.7, 10)).toBe(2)
  })

  it('finds unit page index from units.<n> group key', () => {
    const section: StructuredDomainSection = {
      id: 'units',
      domain: 'units',
      title: { labelKey: 'x', defaultLabel: 'x' },
      rows: [],
      groups: [
        { id: 'units:units.0', domain: 'units', groupKey: 'units.0', rows: [], title: { labelKey: 'x', defaultLabel: 'x' }, defaultCollapsed: false },
        { id: 'units:units.1', domain: 'units', groupKey: 'units.1', rows: [], title: { labelKey: 'x', defaultLabel: 'x' }, defaultCollapsed: false },
      ],
    }

    expect(findUnitPageByIndex(section, 1)).toBe(1)
    expect(findUnitPageByIndex(section, 9)).toBeNull()
  })
})
