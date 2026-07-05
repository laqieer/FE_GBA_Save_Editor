import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  parseSaveFile,
  serializeSaveFile,
  updatePlayState,
  type ParsedSaveFile,
} from './lib/saveCodec'
import { isSupportedSaveFile } from './lib/fileValidation'
import { resolveEditorState } from './lib/editorState'
import './App.css'

type EditModel = {
  gold: string
  chapterIndex: string
  chapterTurn: string
  playerName: string
}

function App() {
  const { t, i18n } = useTranslation()
  const [parsed, setParsed] = useState<ParsedSaveFile | null>(null)
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [edit, setEdit] = useState<EditModel>({
    gold: '',
    chapterIndex: '',
    chapterTurn: '',
    playerName: '',
  })

  const editableBlocks = useMemo(
    () => parsed?.blocks.filter((x) => (x.kind === 0 || x.kind === 1) && x.playState) ?? [],
    [parsed],
  )
  const editableIndexes = useMemo(
    () => editableBlocks.map((x) => x.index),
    [editableBlocks],
  )
  const editorState = useMemo(
    () => resolveEditorState(selectedBlock, editableIndexes),
    [selectedBlock, editableIndexes],
  )

  useEffect(() => {
    const target = editableBlocks.find((x) => x.index === editorState.editingBlock)
    if (!target?.playState) {
      return
    }
    setEdit({
      gold: String(target.playState.gold),
      chapterIndex: String(target.playState.chapterIndex),
      chapterTurn: String(target.playState.chapterTurn),
      playerName: target.playState.playerName,
    })
  }, [editableBlocks, editorState.editingBlock])

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
      const first = next.blocks.find((x) => (x.kind === 0 || x.kind === 1) && x.playState)
      setSelectedBlock(first?.index ?? 0)
      if (!first) {
        setStatus(t('noEditableBlock'))
      }
    } catch {
      setParsed(null)
      setError(t('loadError'))
    }
  }

  function onApplyEdits() {
    if (!parsed) return
    if (editorState.editingBlock === null) {
      setError(t('blockReadOnly'))
      return
    }
    try {
      const next = updatePlayState(parsed, editorState.editingBlock, {
        gold: Number(edit.gold),
        chapterIndex: Number(edit.chapterIndex),
        chapterTurn: Number(edit.chapterTurn),
        playerName: edit.playerName,
      })
      setParsed(next)
      setStatus(t('updated'))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'))
    }
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
          <input type="file" accept=".sav" onChange={(e) => onFileChange(e.target.files?.[0])} />
        </label>
      </section>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      {parsed && (
        <section className="content-grid">
          <div className="card">
            <h2>{t('metadata')}</h2>
            <p>
              {t('game')}: <strong>{parsed.gameCode}</strong> · {t('metadata')}:{' '}
              <strong>{parsed.metadataName || 'N/A'}</strong>
            </p>
            <p>
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

          <div className="card">
            <h2>{t('slot')} #{selectedBlock}</h2>
            {editorState.editingBlock === null && <p>{t('blockReadOnly')}</p>}
            <label>
              {t('gold')}
              <input
                disabled={editorState.editingBlock === null}
                value={edit.gold}
                onChange={(e) => setEdit((v) => ({ ...v, gold: e.target.value }))}
              />
            </label>
            <label>
              {t('chapter')}
              <input
                disabled={editorState.editingBlock === null}
                value={edit.chapterIndex}
                onChange={(e) => setEdit((v) => ({ ...v, chapterIndex: e.target.value }))}
              />
            </label>
            <label>
              {t('turn')}
              <input
                disabled={editorState.editingBlock === null}
                value={edit.chapterTurn}
                onChange={(e) => setEdit((v) => ({ ...v, chapterTurn: e.target.value }))}
              />
            </label>
            <label>
              {t('playerName')}
              <input
                disabled={editorState.editingBlock === null}
                value={edit.playerName}
                onChange={(e) => setEdit((v) => ({ ...v, playerName: e.target.value }))}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                disabled={editorState.editingBlock === null}
                onClick={onApplyEdits}
              >
                {t('apply')}
              </button>
              <button type="button" onClick={onDownload}>
                {t('download')}
              </button>
            </div>
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
