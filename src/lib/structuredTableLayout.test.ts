import { describe, expect, it } from 'vitest'
import type { FieldRow } from './structuredEditor'
import {
  STRUCTURED_DOMAIN_PAGE_SIZE,
  groupRowsByDomainAndGroup,
  paginateStructuredRows,
} from './structuredTableLayout'

function makeRow(overrides: Partial<FieldRow> & Pick<FieldRow, 'key'>): FieldRow {
  return {
    key: overrides.key,
    domain: overrides.domain ?? 'playState',
    groupKey: overrides.groupKey ?? 'playst',
    memberPath: overrides.memberPath ?? overrides.key,
    offset: overrides.offset ?? 0,
    size: overrides.size ?? 1,
    type: overrides.type ?? 'u8',
    labelKey: overrides.labelKey ?? 'field.playst.gold',
    value: overrides.value ?? 0,
    bitIndex: overrides.bitIndex,
    unitIndex: overrides.unitIndex,
  }
}

describe('structuredTableLayout', () => {
  it('groups rows by domain and group while preserving first-seen order', () => {
    const rows: FieldRow[] = [
      makeRow({ key: 'playst.gold', domain: 'playState', groupKey: 'playst' }),
      makeRow({
        key: 'unit.0.level',
        domain: 'units',
        groupKey: 'units.0',
        memberPath: 'units[0].level',
        unitIndex: 0,
      }),
      makeRow({
        key: 'unit.0.exp',
        domain: 'units',
        groupKey: 'units.0',
        memberPath: 'units[0].exp',
        unitIndex: 0,
      }),
      makeRow({
        key: 'inventory.convoy.0.itemId',
        domain: 'inventory',
        groupKey: 'inventory.convoy',
        memberPath: 'inventory.convoy[0].itemId',
      }),
      makeRow({
        key: 'unit.1.level',
        domain: 'units',
        groupKey: 'units.1',
        memberPath: 'units[1].level',
        unitIndex: 1,
      }),
    ]

    const grouped = groupRowsByDomainAndGroup(rows)

    expect(grouped.map((section) => section.domain)).toEqual([
      'playState',
      'units',
      'inventory',
    ])
    expect(grouped[1]?.groups.map((group) => group.groupKey)).toEqual([
      'units.0',
      'units.1',
    ])
    expect(grouped[1]?.groups[0]?.rows.map((row) => row.key)).toEqual([
      'unit.0.level',
      'unit.0.exp',
    ])
  })

  it('caps visible rows per large domain page and keeps group boundaries inside the slice', () => {
    const rows = [
      ...Array.from({ length: 25 }, (_, index) =>
        makeRow({
          key: `unit.0.field.${index}`,
          domain: 'units',
          groupKey: 'units.0',
          memberPath: `units[0].field${index}`,
          unitIndex: 0,
          offset: index,
        }),
      ),
      ...Array.from({ length: STRUCTURED_DOMAIN_PAGE_SIZE - 25 + 5 }, (_, index) =>
        makeRow({
          key: `unit.1.field.${index}`,
          domain: 'units',
          groupKey: 'units.1',
          memberPath: `units[1].field${index}`,
          unitIndex: 1,
          offset: index + 25,
        }),
      ),
    ]
    const grouped = groupRowsByDomainAndGroup(rows)
    const section = grouped[0]

    expect(section).toBeDefined()

    const firstPage = paginateStructuredRows(section!.rows, 0)
    const lastPage = paginateStructuredRows(section!.rows, 999)
    const firstPageGroups = groupRowsByDomainAndGroup(firstPage.rows)[0]?.groups

    expect(firstPage.rows).toHaveLength(STRUCTURED_DOMAIN_PAGE_SIZE)
    expect(firstPage.totalPages).toBe(2)
    expect(lastPage.currentPage).toBe(1)
    expect(lastPage.rows).toHaveLength(5)
    expect(firstPageGroups?.map((group) => group.groupKey)).toEqual([
      'units.0',
      'units.1',
    ])
    expect(firstPageGroups?.[1]?.rows).toHaveLength(7)
  })

  it('marks technical groups collapsed by default', () => {
    const grouped = groupRowsByDomainAndGroup([
      makeRow({
        key: 'bytes.0000',
        domain: 'technical',
        groupKey: 'unknown',
        memberPath: 'bytes.0000',
        type: 'bytes',
        labelKey: 'field.unknown.bytes',
        value: 'ABCD',
      }),
    ])

    expect(grouped[0]?.groups[0]?.defaultCollapsed).toBe(true)
  })
})
