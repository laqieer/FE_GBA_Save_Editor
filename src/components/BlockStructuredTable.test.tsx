import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import type { FieldRow } from '../lib/structuredEditor'
import { groupRowsByDomainAndGroup, paginateStructuredSection } from '../lib/structuredTableLayout'
import { parsePageJump } from '../lib/structuredNavigation'
import {
  BlockStructuredTable,
  buildUnitSelectorOptions,
  resolveUnitSelectorFallbackPage,
  resolveUnitSelectorPage,
} from './BlockStructuredTable'

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

describe('BlockStructuredTable', () => {
  beforeEach(() => {
    void i18n.changeLanguage('en')
  })

  it('renders technical rows with the translated technical label template', () => {
    const markup = renderToStaticMarkup(
      <BlockStructuredTable
        blockKey="test-block"
        rows={[
          makeRow({
            key: 'technical-row',
            domain: 'playState',
            groupKey: 'playst',
            memberPath: 'fe6Units[0].raw_34',
            offset: 0x34,
            labelKey: 'field.tech.fe6Units_0_raw_34',
            value: 0,
          }),
        ]}
        onApplyEdit={() => undefined}
      />,
    )

    expect(markup).toContain('Technical field: fe6Units[0].raw_34 (0x0034)')
    expect(markup).not.toContain('field.tech.fe6Units_0_raw_34')
  })

  it('renders page jump and searchable unit selector controls for structured sections', () => {
    const markup = renderToStaticMarkup(
      <BlockStructuredTable
        blockKey="test-block"
        rows={[
          makeRow({ key: 'u0', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
          makeRow({ key: 'u1', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
        ]}
        onApplyEdit={() => undefined}
      />,
    )

    expect(markup).toContain('aria-label="Page"')
    expect(markup).toContain('Go')
    expect(markup).toContain('aria-label="Unit"')
    expect(markup).toContain('placeholder="Jump to unit name or number"')
    expect(markup).toContain('value="Unit 1"')
    expect(markup).toContain('value="Unit 2"')
  })

  it('builds unit selector options from translated unit titles and resolves labels', () => {
    const sections = groupRowsByDomainAndGroup([
      makeRow({ key: 'u0', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
      makeRow({ key: 'u1', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
    ])
    const section = sections.find((candidate) => candidate.domain === 'units')

    expect(section).toBeDefined()
    if (!section) return

    const options = buildUnitSelectorOptions(section, i18n.t.bind(i18n))

    expect(options.map((option) => option.value)).toEqual(['Unit 1', 'Unit 2'])
    expect(resolveUnitSelectorPage(section, 'Unit 2', options)).toBe(1)
    expect(resolveUnitSelectorPage(section, 'unit 1', options)).toBe(0)
    expect(resolveUnitSelectorPage(section, '2', options)).toBe(1)
    expect(resolveUnitSelectorPage(section, '999', options)).toBeNull()
    expect(resolveUnitSelectorFallbackPage(section, '999', options)).toBe(0)
  })

  it('goes to the requested page and rejects invalid page input', () => {
    const rows: FieldRow[] = [
      ...Array.from({ length: 31 }, (_, index) =>
        makeRow({
          key: `playst.${index}`,
          domain: 'playState',
          groupKey: 'playst',
          memberPath: `playst.${index}`,
          offset: index,
        }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        makeRow({
          key: `chapter.${index}`,
          domain: 'playState',
          groupKey: 'chapter',
          memberPath: `chapter.${index}`,
          offset: 31 + index,
        }),
      ),
    ]
    const section = groupRowsByDomainAndGroup(rows)[0]!

    expect(parsePageJump('2', 2)).toBe(1)
    expect(parsePageJump('999', 2)).toBe(1)
    expect(parsePageJump('0', 2)).toBeNull()
    expect(parsePageJump('abc', 2)).toBeNull()

    const page = paginateStructuredSection(section, parsePageJump('2', 2)!)
    expect(page.currentPage).toBe(1)
    expect(page.visibleGroupIds).toEqual(['playState:chapter'])
    expect(page.rows.map((row) => row.key)).toEqual([
      'chapter.1',
      'chapter.2',
      'chapter.3',
      'chapter.4',
    ])
  })

  it('changes visible rows when a different unit is selected', () => {
    const section = groupRowsByDomainAndGroup([
      makeRow({ key: 'u0.a', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
      makeRow({ key: 'u0.b', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
      makeRow({ key: 'u1.a', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
      makeRow({ key: 'u1.b', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
    ]).find((candidate) => candidate.domain === 'units')

    expect(section).toBeDefined()
    if (!section) return

    const options = buildUnitSelectorOptions(section, i18n.t.bind(i18n))
    const pageIndex = resolveUnitSelectorPage(section, 'Unit 2', options)

    expect(pageIndex).toBe(1)

    const page = paginateStructuredSection(section, pageIndex ?? 0)
    expect(page.visibleGroupIds).toEqual(['units:units.1'])
    expect(page.rows.map((row) => row.key)).toEqual(['u1.a', 'u1.b'])
  })
})
