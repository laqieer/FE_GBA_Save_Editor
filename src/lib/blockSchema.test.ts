import { describe, expect, it } from 'vitest'
import { buildFe6SaveSchema, buildFe7SaveSchema } from './blockSchema'

describe('blockSchema', () => {
  it('buildFe6SaveSchema uses FE6-specific unit labels and member paths', () => {
    const unitFields = buildFe6SaveSchema().filter((field) => field.domain === 'units')

    expect(unitFields.some((field) => field.labelKey === 'field.fe6Unit.level')).toBe(true)
    expect(unitFields.some((field) => field.memberPath === 'fe6Units[0].level')).toBe(true)
    expect(unitFields.some((field) => field.labelKey === 'field.unit.level')).toBe(false)
    expect(unitFields.some((field) => field.memberPath === 'units[0].level')).toBe(false)
  })

  it('buildFe7SaveSchema uses FE7-specific unit labels and member paths', () => {
    const unitFields = buildFe7SaveSchema().filter((field) => field.domain === 'units')

    expect(unitFields.some((field) => field.labelKey === 'field.fe7Unit.level')).toBe(true)
    expect(unitFields.some((field) => field.memberPath === 'fe7Units[0].level')).toBe(true)
    expect(unitFields.some((field) => field.labelKey === 'field.unit.level')).toBe(false)
    expect(unitFields.some((field) => field.memberPath === 'units[0].level')).toBe(false)
  })
})
