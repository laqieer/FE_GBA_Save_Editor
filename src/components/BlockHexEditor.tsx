import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  reconcileDraftErrors,
  reconcileDraftValues,
} from '../lib/editorDraftState'
import { toHexRows } from '../lib/hexEditor'

type BlockHexEditorProps = {
  blockKey: number
  blockBytes: Uint8Array
  onApplyEdit: (absoluteByteOffset: number, nextHexPair: string) => void
}

function formatOffset(offset: number): string {
  return `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
}

function toErrorKey(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'editorUnknownError'
  }
  if (error.message === 'Invalid hex byte') {
    return 'hexEditor.invalidByte'
  }
  return error.message
}

export function BlockHexEditor({
  blockKey,
  blockBytes,
  onApplyEdit,
}: BlockHexEditorProps) {
  const { t } = useTranslation()
  const rows = useMemo(() => toHexRows(blockBytes), [blockBytes])
  const canonicalValues = useMemo(() => {
    const nextValues: Record<number, string> = {}
    for (const row of rows) {
      for (let columnIndex = 0; columnIndex < row.hex.length; columnIndex += 1) {
        nextValues[row.rowOffset + columnIndex] = row.hex[columnIndex]
      }
    }
    return nextValues
  }, [rows])
  const previousCanonicalValues = useRef(canonicalValues)
  const previousBlockKey = useRef(blockKey)
  const [state, setState] = useState<{
    drafts: Record<number, string>
    errors: Record<number, string>
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

  function clearError(offset: number) {
    setState((current) => {
      if (!(offset in current.errors)) {
        return current
      }
      const next = { ...current.errors }
      delete next[offset]
      return {
        ...current,
        errors: next,
      }
    })
  }

  function applyOffset(offset: number) {
    const nextHexPair = (state.drafts[offset] ?? '').trim().toUpperCase()
    try {
      onApplyEdit(offset, nextHexPair)
      clearError(offset)
    } catch (error) {
      setState((current) => ({
        ...current,
        errors: {
          ...current.errors,
          [offset]: t(toErrorKey(error), {
            defaultValue: error instanceof Error ? error.message : t('editorUnknownError'),
          }),
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
            <th>{t('hexEditor.hex')}</th>
            <th>{t('ascii')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowErrors = row.hex.flatMap((_, columnIndex) => {
              const byteOffset = row.rowOffset + columnIndex
              const message = state.errors[byteOffset]
              return message
                ? [{ byteOffset, message }]
                : []
            })

            return (
              <tr key={row.rowOffset}>
                <td className="mono">{formatOffset(row.rowOffset)}</td>
                <td>
                  <div className="hex-row-cells">
                    {row.hex.map((hexPair, columnIndex) => {
                      const byteOffset = row.rowOffset + columnIndex
                      const error = state.errors[byteOffset]

                      return (
                        <input
                          key={byteOffset}
                          className={`hex-input mono ${error ? 'input-error' : ''}`}
                          aria-label={`${t('hexEditor.hex')} ${formatOffset(byteOffset)}`}
                          inputMode="text"
                          spellCheck={false}
                          maxLength={2}
                          value={state.drafts[byteOffset] ?? hexPair}
                          onChange={(event) => {
                            const nextValue = event.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 2)
                            setState((current) => ({
                              ...current,
                              drafts: {
                                ...current.drafts,
                                [byteOffset]: nextValue,
                              },
                            }))
                            clearError(byteOffset)
                          }}
                          onBlur={() => applyOffset(byteOffset)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              applyOffset(byteOffset)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                  {rowErrors.length > 0 && (
                    <ul className="hex-error-list">
                      {rowErrors.map(({ byteOffset, message }) => (
                        <li key={byteOffset}>
                          <span className="mono">{formatOffset(byteOffset)}</span>: {message}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="mono hex-ascii">{row.ascii}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
