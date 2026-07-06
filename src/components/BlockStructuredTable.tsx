import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  reconcileDraftErrors,
  reconcileDraftValues,
} from '../lib/editorDraftState'
import type { FieldRow } from '../lib/structuredEditor'
import {
  groupRowsByDomainAndGroup,
  paginateStructuredSection,
  type StructuredDomainSection,
} from '../lib/structuredTableLayout'
import { findUnitPageByIndex, parsePageJump } from '../lib/structuredNavigation'

type BlockStructuredTableProps = {
  blockKey: string
  rows: FieldRow[]
  onApplyEdit: (rowKey: string, nextValue: string) => void
}

type Translate = (key: string, options?: Record<string, unknown>) => string

export type UnitSelectorOption = {
  pageIndex: number
  value: string
  label: string
  searchText: string
}

function formatRowValue(value: number | string): string {
  return String(value)
}

function formatOffset(offset: number): string {
  return `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
}

function formatTechnicalOffset(offset: number): string {
  return formatOffset(offset).slice(2)
}

function formatTypeLabel(type: FieldRow['type']): string {
  return type === 'bytes' ? 'HEX' : type.toUpperCase()
}

function toTranslatedError(
  t: Translate,
  error: unknown,
): string {
  if (error instanceof Error) {
    return t(error.message, { defaultValue: error.message })
  }
  return t('editorUnknownError')
}

function normalizeSelectorText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function translateGroupTitle(t: Translate, group: StructuredDomainSection['groups'][number]): string {
  return t(group.title.labelKey, {
    ...group.title.options,
    defaultValue: group.title.defaultLabel,
  })
}

export function buildUnitSelectorOptions(
  section: StructuredDomainSection,
  t: Translate,
): UnitSelectorOption[] {
  if (section.domain !== 'units') return []

  return section.groups.map((group, index) => {
    const translatedTitle = translateGroupTitle(t, group)
    const value = translatedTitle
    const label = `#${index + 1}`
    const searchText = normalizeSelectorText(
      [value, label, String(index + 1), group.groupKey, group.title.defaultLabel]
        .filter((part) => part.length > 0)
        .join(' '),
    )

    return {
      pageIndex: index,
      value,
      label,
      searchText,
    }
  })
}

export function resolveUnitSelectorPage(
  section: StructuredDomainSection,
  input: string,
  options: readonly UnitSelectorOption[],
): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^[0-9]+$/.test(trimmed)) {
    const numericUnit = Number(trimmed)
    if (!Number.isSafeInteger(numericUnit) || numericUnit <= 0) return null
    return findUnitPageByIndex(section, numericUnit - 1)
  }

  const normalized = normalizeSelectorText(trimmed)
  const exactMatch = options.find(
    (option) =>
      option.searchText === normalized || normalizeSelectorText(option.value) === normalized,
  )
  if (exactMatch) return exactMatch.pageIndex

  const prefixMatches = options.filter((option) => option.searchText.startsWith(normalized))
  return prefixMatches.length === 1 ? prefixMatches[0].pageIndex : null
}

export function resolveUnitSelectorFallbackPage(
  section: StructuredDomainSection,
  currentValue: string | undefined,
  options: readonly UnitSelectorOption[],
): number {
  if (!currentValue) return 0
  return resolveUnitSelectorPage(section, currentValue, options) ?? 0
}

function getUnitSelectorValue(
  section: StructuredDomainSection,
  pageIndex: number,
  t: Translate,
): string {
  const group = section.groups[pageIndex]
  return group ? translateGroupTitle(t, group) : String(pageIndex + 1)
}

export function BlockStructuredTable({
  blockKey,
  rows,
  onApplyEdit,
}: BlockStructuredTableProps) {
  const { t } = useTranslation()
  const groupedRows = useMemo(() => groupRowsByDomainAndGroup(rows), [rows])
  const groups = useMemo(
    () => groupedRows.flatMap((section) => section.groups),
    [groupedRows],
  )
  const unitSelectorOptionsBySection = useMemo(
    () =>
      new Map(
        groupedRows
          .filter((section) => section.domain === 'units')
          .map((section) => [section.id, buildUnitSelectorOptions(section, t)]),
      ),
    [groupedRows, t],
  )
  const canonicalValues = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [row.key, formatRowValue(row.value)]),
      ) as Record<string, string>,
    [rows],
  )
  const previousCanonicalValues = useRef(canonicalValues)
  const previousBlockKey = useRef(blockKey)
  const [state, setState] = useState<{
    drafts: Record<string, string>
    errors: Record<string, string>
  }>({
    drafts: canonicalValues,
    errors: {},
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [domainPages, setDomainPages] = useState<Record<string, number>>({})
  const [pageJumpInputs, setPageJumpInputs] = useState<Record<string, string>>({})
  const [unitJumpInputs, setUnitJumpInputs] = useState<Record<string, string>>({})
  const previousLayoutBlockKey = useRef(blockKey)
  const previousNavigationBlockKey = useRef(blockKey)

  useEffect(() => {
    setState((current) => {
      const preserveDirtyState = previousBlockKey.current === blockKey
      const nextState = {
        drafts: reconcileDraftValues(
          current.drafts,
          previousCanonicalValues.current,
          canonicalValues,
          preserveDirtyState,
        ),
        errors: reconcileDraftErrors(
          current.errors,
          current.drafts,
          previousCanonicalValues.current,
          canonicalValues,
          preserveDirtyState,
        ),
      }
      previousCanonicalValues.current = canonicalValues
      previousBlockKey.current = blockKey
      return nextState
    })
  }, [blockKey, canonicalValues])

  useEffect(() => {
    const preserveGroupState = previousLayoutBlockKey.current === blockKey

    setCollapsedGroups((current) => {
      const next: Record<string, boolean> = {}
      for (const group of groups) {
        next[group.id] = preserveGroupState
          ? current[group.id] ?? group.defaultCollapsed
          : group.defaultCollapsed
      }
      return next
    })
    setDomainPages((current) => {
      const next: Record<string, number> = {}
      for (const section of groupedRows) {
        const currentPage = preserveGroupState ? current[section.id] ?? 0 : 0
        const unitOptions = unitSelectorOptionsBySection.get(section.id) ?? []
        const nextPage =
          section.domain === 'units'
            ? resolveUnitSelectorFallbackPage(
                section,
                unitJumpInputs[section.id],
                unitOptions,
              )
            : currentPage
        const page = paginateStructuredSection(section, nextPage)
        next[section.id] = page.currentPage
      }
      return next
    })
    setPageJumpInputs((current) => {
      const next: Record<string, string> = {}
      for (const section of groupedRows) {
        if (section.domain !== 'units') {
          continue
        }
        const unitOptions = unitSelectorOptionsBySection.get(section.id) ?? []
        const nextPage = resolveUnitSelectorFallbackPage(
          section,
          unitJumpInputs[section.id],
          unitOptions,
        )
        next[section.id] = String(nextPage + 1)
      }
      return Object.keys(next).length > 0 ? { ...current, ...next } : current
    })
    setUnitJumpInputs((current) => {
      const next: Record<string, string> = {}
      for (const section of groupedRows) {
        if (section.domain !== 'units') {
          continue
        }
        const unitOptions = unitSelectorOptionsBySection.get(section.id) ?? []
        const nextPage = resolveUnitSelectorFallbackPage(
          section,
          unitJumpInputs[section.id],
          unitOptions,
        )
        next[section.id] = getUnitSelectorValue(section, nextPage, t)
      }
      return Object.keys(next).length > 0 ? { ...current, ...next } : current
    })

    previousLayoutBlockKey.current = blockKey
  }, [blockKey, groupedRows, groups, t, unitSelectorOptionsBySection])

  useEffect(() => {
    const preserveNavigationState = previousNavigationBlockKey.current === blockKey
    if (!preserveNavigationState) {
      setPageJumpInputs({})
      setUnitJumpInputs({})
    }
    previousNavigationBlockKey.current = blockKey
  }, [blockKey])

  function clearError(rowKey: string) {
    setState((current) => {
      if (!(rowKey in current.errors)) {
        return current
      }
      const next = { ...current.errors }
      delete next[rowKey]
      return {
        ...current,
        errors: next,
      }
    })
  }

  function setSectionPage(section: StructuredDomainSection, nextPage: number) {
    const nextValue = String(nextPage + 1)
    setDomainPages((current) => ({
      ...current,
      [section.id]: nextPage,
    }))
    setPageJumpInputs((current) => ({
      ...current,
      [section.id]: nextValue,
    }))
    setUnitJumpInputs((current) => ({
      ...current,
      [section.id]:
        section.domain === 'units'
          ? getUnitSelectorValue(section, nextPage, t)
          : nextValue,
    }))
  }

  function applyPageJump(section: StructuredDomainSection, totalPages: number) {
    const parsed = parsePageJump(pageJumpInputs[section.id] ?? '', totalPages)
    if (parsed === null) return
    setSectionPage(section, parsed)
  }

  function applyRow(rowKey: string) {
    const nextValue = state.drafts[rowKey] ?? canonicalValues[rowKey] ?? ''
    try {
      onApplyEdit(rowKey, nextValue)
      clearError(rowKey)
    } catch (error) {
      setState((current) => ({
        ...current,
        errors: {
          ...current.errors,
          [rowKey]: toTranslatedError(t, error),
        },
      }))
    }
  }

  function renderRow(row: FieldRow) {
    const fieldLabel = row.labelKey.startsWith('field.tech.')
      ? t('technicalFieldLabel', {
          memberPath: row.memberPath,
          offset: formatTechnicalOffset(row.offset),
          defaultValue: `${row.memberPath} (${formatOffset(row.offset)})`,
        })
      : t(row.labelKey, { defaultValue: row.labelKey })
    const error = state.errors[row.key]
    const draftValue = state.drafts[row.key] ?? canonicalValues[row.key] ?? ''
    const isDirty = draftValue !== canonicalValues[row.key]

    return (
      <tr key={row.key}>
        <td className="mono">{formatOffset(row.offset)}</td>
        <td>{fieldLabel}</td>
        <td className="mono">{formatTypeLabel(row.type)}</td>
        <td>{row.size}</td>
        <td>
          <div className="field-input-group">
            <input
              className={`field-input ${error ? 'input-error' : ''}`}
              spellCheck={false}
              value={draftValue}
              onChange={(event) => {
                const nextValue = event.target.value
                setState((current) => ({
                  ...current,
                  drafts: {
                    ...current.drafts,
                    [row.key]: nextValue,
                  },
                }))
                clearError(row.key)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyRow(row.key)
                }
              }}
            />
            {error && <p className="inline-error">{error}</p>}
          </div>
        </td>
        <td className="row-actions">
          <button type="button" onClick={() => applyRow(row.key)}>
            {isDirty ? t('apply') : t('reapply')}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="structured-groups">
      {groupedRows.map((section) => (
        <section className="structured-domain-section" key={section.id}>
          {(() => {
            const page = paginateStructuredSection(section, domainPages[section.id] ?? 0)
            const visibleGroups = section.groups.filter((group) =>
              page.visibleGroupIds.includes(group.id),
            )

            return (
              <>
                <div className="structured-domain-header">
                  <div className="structured-domain-copy">
                    <h3 className="structured-domain-title">
                      {t(section.title.labelKey, {
                        ...section.title.options,
                        defaultValue: section.title.defaultLabel,
                      })}
                    </h3>
                    <p className="structured-domain-meta">
                      {t('structuredEditor.fieldCount', {
                        count: section.rows.length,
                        defaultValue: `${section.rows.length} fields`,
                      })}
                    </p>
                  </div>

                  {page.totalPages > 1 && (
                    <div className="structured-group-controls">
                      <label className="structured-page-jump">
                        <input
                          aria-label={t('structuredEditor.pageInputLabel')}
                          inputMode="numeric"
                          spellCheck={false}
                          value={pageJumpInputs[section.id] ?? String(page.currentPage + 1)}
                          onChange={(event) =>
                            setPageJumpInputs((current) => ({
                              ...current,
                              [section.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              applyPageJump(section, page.totalPages)
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => applyPageJump(section, page.totalPages)}
                      >
                        {t('structuredEditor.goToPage')}
                      </button>
                      <button
                        type="button"
                        disabled={page.currentPage === 0}
                        onClick={() => setSectionPage(section, Math.max(0, page.currentPage - 1))}
                      >
                        {t('previous')}
                      </button>
                      <span className="structured-group-page-status">
                        {t('structuredEditor.pageStatus', {
                          current: page.currentPage + 1,
                          total: page.totalPages,
                          defaultValue: `Page ${page.currentPage + 1} / ${page.totalPages}`,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={page.currentPage >= page.totalPages - 1}
                        onClick={() =>
                          setSectionPage(section, Math.min(page.totalPages - 1, page.currentPage + 1))
                        }
                      >
                        {t('next')}
                      </button>
                    </div>
                  )}
                  {section.domain === 'units' && (
                    <div className="structured-group-controls">
                      <label className="structured-unit-jump">
                        <input
                          aria-label={t('structuredEditor.unitSelector')}
                          list={`unit-options-${section.id}`}
                          placeholder={t('structuredEditor.unitSelectorPlaceholder')}
                          spellCheck={false}
                          value={
                            unitJumpInputs[section.id] ??
                            getUnitSelectorValue(section, page.currentPage, t)
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setUnitJumpInputs((current) => ({
                              ...current,
                              [section.id]: nextValue,
                            }))

                            const unitPage = resolveUnitSelectorPage(
                              section,
                              nextValue,
                              unitSelectorOptionsBySection.get(section.id) ?? [],
                            )
                            if (unitPage === null) return

                            setSectionPage(section, unitPage)
                          }}
                        />
                      </label>
                      <datalist id={`unit-options-${section.id}`}>
                        {(unitSelectorOptionsBySection.get(section.id) ?? []).map((option) => (
                          <option
                            key={section.groups[option.pageIndex]?.id ?? option.value}
                            value={option.value}
                            label={option.label}
                          />
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>

                {visibleGroups.map((group) => {
                  const isCollapsed = collapsedGroups[group.id] ?? group.defaultCollapsed

                  return (
                    <section className="structured-group" key={group.id}>
                      <div className="structured-group-header">
                        <div className="structured-group-copy">
                          <h4 className="structured-group-title">
                            {t(group.title.labelKey, {
                              ...group.title.options,
                              defaultValue: group.title.defaultLabel,
                            })}
                          </h4>
                          <p className="structured-group-meta">
                            {t('structuredEditor.fieldCount', {
                              count: group.rows.length,
                              defaultValue: `${group.rows.length} fields`,
                            })}
                          </p>
                        </div>

                        <div className="structured-group-controls">
                          <button
                            type="button"
                            aria-expanded={!isCollapsed}
                            onClick={() =>
                              setCollapsedGroups((current) => ({
                                ...current,
                                [group.id]: !isCollapsed,
                              }))
                            }
                          >
                            {isCollapsed
                              ? t('structuredEditor.expandGroup')
                              : t('structuredEditor.collapseGroup')}
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="structured-group-body">
                          <div className="table-wrapper">
                            <table className="editor-table">
                              <thead>
                                <tr>
                                  <th>{t('offset')}</th>
                                  <th>{t('field')}</th>
                                  <th>{t('type')}</th>
                                  <th>{t('size')}</th>
                                  <th>{t('value')}</th>
                                  <th>{t('actions')}</th>
                                </tr>
                              </thead>
                              <tbody>{group.rows.map(renderRow)}</tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </>
            )
          })()}
        </section>
      ))}
    </div>
  )
}
