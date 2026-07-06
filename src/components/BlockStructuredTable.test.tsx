import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import type { FieldRow } from '../lib/structuredEditor'
import { groupRowsByDomainAndGroup } from '../lib/structuredTableLayout'
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
})
