import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  reconcileDraftErrors,
  reconcileDraftValues,
} from '../lib/editorDraftState'
import type { FieldRow } from '../lib/structuredEditor'

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

  return (
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
        <tbody>
          {rows.map((row) => {
            const fieldLabel = t(row.labelKey, { defaultValue: row.labelKey })
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
          })}
        </tbody>
      </table>
    </div>
  )
}
