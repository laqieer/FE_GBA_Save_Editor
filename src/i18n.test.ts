import { describe, expect, it } from 'vitest'
import i18n from './i18n'

describe('i18n', () => {
  it('uses generic editable-block copy across locales', () => {
    expect(i18n.getResourceBundle('en', 'translation').noEditableBlock).toBe('No editable block found.')
    expect(i18n.getResourceBundle('ja', 'translation').noEditableBlock).toBe('編集可能なブロックが見つかりません。')
    expect(i18n.getResourceBundle('zh', 'translation').noEditableBlock).toBe('未找到可编辑的区块。')
  })

  it('includes full-block editor labels and validation errors in every locale', () => {
    const requiredKeys = [
      'blockEditor',
      'structuredTab',
      'hexTab',
      'editorUnknownError',
      'hexEditor.hex',
      'hexEditor.pageStatus',
      'hexEditor.byteRange',
      'hexEditor.invalidByte',
      'saveCodec.invalidBlock',
      'saveCodec.patchOutOfRange',
      'structuredEditor.invalidRow',
      'structuredEditor.invalidInteger',
      'structuredEditor.outOfRange',
      'structuredEditor.invalidBytes',
      'structuredEditor.textTooLong',
      'field.unknown.byte',
      'field.unknown.bytes',
    ] as const

    for (const language of ['en', 'ja', 'zh'] as const) {
      const bundle = i18n.getResourceBundle(language, 'translation') as Record<string, string>
      for (const key of requiredKeys) {
        expect(bundle[key], `${language}:${key}`).toBeTruthy()
      }
    }
  })
})
