import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  reconcileDraftErrors,
  reconcileDraftValues,
} from '../lib/editorDraftState'
import type { FieldRow } from '../lib/structuredEditor'
import {
  STRUCTURED_DOMAIN_PAGE_SIZE,
  groupRowsByDomainAndGroup,
  paginateStructuredRows,
} from '../lib/structuredTableLayout'

type BlockStructuredTableProps = {
  blockKey: string
  rows: FieldRow[]
  onApplyEdit: (rowKey: string, nextValue: string) => void
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
  t: (key: string, options?: Record<string, unknown>) => string,
  error: unknown,
): string {
  if (error instanceof Error) {
    return t(error.message, { defaultValue: error.message })
  }
  return t('editorUnknownError')
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
  const previousLayoutBlockKey = useRef(blockKey)

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
        const lastPage = Math.max(
          0,
          Math.ceil(section.rows.length / STRUCTURED_DOMAIN_PAGE_SIZE) - 1,
        )
        next[section.id] = Math.min(Math.max(0, currentPage), lastPage)
      }
      return next
    })

    previousLayoutBlockKey.current = blockKey
  }, [blockKey, groupedRows, groups])

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
            const page = paginateStructuredRows(
              section.rows,
              domainPages[section.id] ?? 0,
            )
            const visibleGroups =
              groupRowsByDomainAndGroup(page.rows).find(
                (candidate) => candidate.id === section.id,
              )?.groups ?? []

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
                      <button
                        type="button"
                        disabled={page.currentPage === 0}
                        onClick={() =>
                          setDomainPages((current) => ({
                            ...current,
                            [section.id]: Math.max(0, page.currentPage - 1),
                          }))
                        }
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
                          setDomainPages((current) => ({
                            ...current,
                            [section.id]: Math.min(
                              page.totalPages - 1,
                              page.currentPage + 1,
                            ),
                          }))
                        }
                      >
                        {t('next')}
                      </button>
                    </div>
                  )}
                </div>

                {visibleGroups.map((group) => {
                  const fullGroup =
                    section.groups.find((candidate) => candidate.id === group.id) ?? group
                  const isCollapsed =
                    collapsedGroups[group.id] ?? fullGroup.defaultCollapsed

                  return (
                    <section className="structured-group" key={group.id}>
                      <div className="structured-group-header">
                        <div className="structured-group-copy">
                          <h4 className="structured-group-title">
                            {t(fullGroup.title.labelKey, {
                              ...fullGroup.title.options,
                              defaultValue: fullGroup.title.defaultLabel,
                            })}
                          </h4>
                          <p className="structured-group-meta">
                            {t('structuredEditor.fieldCount', {
                              count: fullGroup.rows.length,
                              defaultValue: `${fullGroup.rows.length} fields`,
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
