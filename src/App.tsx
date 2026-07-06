import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  parseSaveFile,
  readBlockBytes,
  serializeSaveFile,
  type ParsedSaveFile,
} from './lib/saveCodec'
import { isSupportedSaveFile } from './lib/fileValidation'
import {
  buildEditorBlockKey,
  getEditableBlockIndexes,
  resolveEditorState,
} from './lib/editorState'
import { BlockEditorTabs } from './components/BlockEditorTabs'
import './App.css'

function App() {
  const { t, i18n } = useTranslation()
  const [parsed, setParsed] = useState<ParsedSaveFile | null>(null)
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [saveRevision, setSaveRevision] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const editableIndexes = useMemo(
    () => (parsed ? getEditableBlockIndexes(parsed) : []),
    [parsed],
  )
  const editorState = useMemo(
    () => resolveEditorState(selectedBlock, editableIndexes),
    [selectedBlock, editableIndexes],
  )
  const selectedBlockView = useMemo(
    () => parsed?.blocks.find((block) => block.index === editorState.selectedBlock) ?? null,
    [editorState.selectedBlock, parsed],
  )

  async function onFileChange(file?: File) {
    if (!file) return
    setStatus('')
    setError('')
    if (!isSupportedSaveFile(file.name)) {
      setParsed(null)
      setError(t('invalidFileType'))
      return
    }
    try {
      const next = await parseSaveFile(file)
      setParsed(next)
      setSaveRevision((current) => current + 1)
      const editableBlockIndexes = getEditableBlockIndexes(next)
      setSelectedBlock(editableBlockIndexes[0] ?? next.blocks[0]?.index ?? 0)
    } catch {
      setParsed(null)
      setError(t('loadError'))
    }
  }

  function onParsedChange(next: ParsedSaveFile) {
    setParsed(next)
    setStatus(t('updated'))
    setError('')
  }

  function onDownload() {
    if (!parsed) return
    const bytes = serializeSaveFile(parsed)
    const blob = new Blob([Uint8Array.from(bytes).buffer], {
      type: 'application/octet-stream',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = parsed.fileName.replace(/\.sav$/i, '') + '-edited.sav'
    a.click()
    URL.revokeObjectURL(url)
  }

  function blockKindLabel(kind: number) {
    if (kind === 0) return t('blockKind0')
    if (kind === 1) return t('blockKind1')
    if (kind === 2) return t('blockKind2')
    if (kind === 3) return t('blockKind3')
    return t('blockKindOther')
  }

  function selectedBlockChecksumLabel() {
    if (!parsed || editorState.editingBlock === null) {
      return t('invalid')
    }
    try {
      readBlockBytes(parsed, editorState.editingBlock)
      return selectedBlockView?.checksumValid ? t('valid') : t('invalid')
    } catch {
      return t('invalid')
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
      </header>

      <section className="toolbar">
        <label className="file-input">
          {t('upload')}
          <input type="file" accept=".sav,.sps" onChange={(e) => onFileChange(e.target.files?.[0])} />
        </label>
      </section>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      {parsed && (
        <section className="content-grid">
          <div className="card">
            <h2>{t('metadata')}</h2>
            <p className="metadata-line">
              {t('game')}: <strong>{parsed.gameCode}</strong> · {t('metadata')}:{' '}
              <strong>{parsed.metadataName || 'N/A'}</strong>
            </p>
            <p className="metadata-line">
              {t('generalChecksum')}: <strong>{parsed.generalChecksumValid ? t('valid') : t('invalid')}</strong>
            </p>
            <label>
              {t('slot')}
              <select value={selectedBlock} onChange={(e) => setSelectedBlock(Number(e.target.value))}>
                {parsed.blocks.map((block) => (
                  <option key={block.index} value={block.index}>
                    #{block.index} · {blockKindLabel(block.kind)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="card editor-card">
            <div className="card-heading">
              <div>
                <h2>{t('blockEditor')}</h2>
                {selectedBlockView && (
                  <p className="muted">
                    {t('slot')} #{selectedBlockView.index} · {blockKindLabel(selectedBlockView.kind)} · {t('checksum')}:{' '}
                    <strong>{selectedBlockChecksumLabel()}</strong>
                  </p>
                )}
              </div>
              <div className="button-row">
                <button type="button" onClick={onDownload}>
                  {t('download')}
                </button>
              </div>
            </div>
            {editorState.editingBlock === null ? (
              <p>{t('blockReadOnly')}</p>
            ) : (
              <BlockEditorTabs
                parsed={parsed}
                blockIndex={editorState.editingBlock}
                blockKey={buildEditorBlockKey(saveRevision, editorState.editingBlock)}
                onParsedChange={onParsedChange}
              />
            )}
          </div>

          <div className="card table-card">
            <h2>{t('slot')} {t('metadata')}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t('slot')}</th>
                  <th>{t('kind')}</th>
                  <th>{t('offset')}</th>
                  <th>{t('size')}</th>
                  <th>{t('checksum')}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.blocks.map((block) => (
                  <tr key={block.index}>
                    <td>#{block.index}</td>
                    <td>{blockKindLabel(block.kind)}</td>
                    <td>0x{block.offset.toString(16).toUpperCase()}</td>
                    <td>0x{block.size.toString(16).toUpperCase()}</td>
                    <td>{block.checksumValid ? t('valid') : t('invalid')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="footer">
        <p>{t('sourceInfo')}</p>
        <div className="links">
          <a href="https://gamefaqs.gamespot.com/search?game=fire+emblem" target="_blank" rel="noreferrer">
            GameFAQs
          </a>
          <a href="https://github.com/StanHash/DOC/blob/master/SaveMetadata.txt" target="_blank" rel="noreferrer">
            SaveMetadata
          </a>
          <a href="https://github.com/laqieer/fe-maps" target="_blank" rel="noreferrer">
            fe-maps
          </a>
          <a href="https://github.com/laqieer/FE_GBA_Save_Editor" target="_blank" rel="noreferrer">
            Source Code
          </a>
        </div>
      </footer>
    </main>
  )
}

export default App
