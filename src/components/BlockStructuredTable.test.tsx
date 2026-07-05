import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import type { FieldRow } from '../lib/structuredEditor'
import { BlockStructuredTable } from './BlockStructuredTable'

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
})
