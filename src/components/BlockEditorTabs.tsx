import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyHexEdit } from '../lib/hexEditor'
import { readBlockBytes, type ParsedSaveFile } from '../lib/saveCodec'
import { applyStructuredEdit, getStructuredRows } from '../lib/structuredEditor'
import { BlockHexEditor } from './BlockHexEditor'
import { BlockStructuredTable } from './BlockStructuredTable'

type BlockEditorTabsProps = {
  parsed: ParsedSaveFile
  blockIndex: number
  blockKey: string
  onParsedChange: (next: ParsedSaveFile) => void
}

type EditorTab = 'structured' | 'hex'

export function BlockEditorTabs({
  parsed,
  blockIndex,
  blockKey,
  onParsedChange,
}: BlockEditorTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<EditorTab>('structured')

  const structuredRows = useMemo(
    () => getStructuredRows(parsed, blockIndex),
    [parsed, blockIndex],
  )
  const blockBytes = useMemo(
    () => readBlockBytes(parsed, blockIndex),
    [parsed, blockIndex],
  )

  function handleStructuredEdit(rowKey: string, nextValue: string) {
    onParsedChange(applyStructuredEdit(parsed, blockIndex, rowKey, nextValue))
  }

  function handleHexEdit(absoluteByteOffset: number, nextHexPair: string) {
    onParsedChange(applyHexEdit(parsed, blockIndex, absoluteByteOffset, nextHexPair))
  }

  return (
    <section className="block-editor">
      <div className="tab-list" role="tablist" aria-label={t('blockEditor')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'structured'}
          className={`tab-button ${activeTab === 'structured' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('structured')}
        >
          {t('structuredTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'hex'}
          className={`tab-button ${activeTab === 'hex' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('hex')}
        >
          {t('hexTab')}
        </button>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'structured'}>
        <BlockStructuredTable
          blockKey={blockKey}
          rows={structuredRows}
          onApplyEdit={handleStructuredEdit}
        />
      </div>
      <div role="tabpanel" hidden={activeTab !== 'hex'}>
        <BlockHexEditor
          blockKey={blockKey}
          blockBytes={blockBytes}
          onApplyEdit={handleHexEdit}
        />
      </div>
    </section>
  )
}
