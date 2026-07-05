import { describe, expect, it } from 'vitest'
import i18n from './i18n'

describe('i18n', () => {
  it('uses generic editable-block copy across locales', () => {
    expect(i18n.getResourceBundle('en', 'translation').noEditableBlock).toBe('No editable block found.')
    expect(i18n.getResourceBundle('ja', 'translation').noEditableBlock).toBe('編集可能なブロックが見つかりません。')
    expect(i18n.getResourceBundle('zh', 'translation').noEditableBlock).toBe('未找到可编辑的区块。')
  })

  it('contains localization keys for structured domains and technical labels', () => {
    const bundle = i18n.getResourceBundle('en', 'translation') as Record<string, any>
    expect(bundle.structuredDomainUnits).toBeTruthy()
    expect(bundle.structuredDomainInventory).toBeTruthy()
    expect(bundle.structuredDomainProgressFlags).toBeTruthy()
    expect(bundle.technicalFieldLabel).toBeTruthy()
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
      'structuredEditor.pageStatus',
      'structuredEditor.expandGroup',
      'structuredEditor.collapseGroup',
      'structuredEditor.fieldCount',
      'structuredEditor.domain.playState',
      'structuredEditor.domain.units',
      'structuredEditor.domain.inventory',
      'structuredEditor.domain.progressFlags',
      'structuredEditor.domain.technical',
      'structuredEditor.group.playState',
      'structuredEditor.group.unit',
      'structuredEditor.group.inventoryConvoy',
      'structuredEditor.group.progressChapter',
      'structuredEditor.group.progressSupport',
      'structuredEditor.group.progressWorld',
      'structuredEditor.group.unknown',
      'field.unit.characterId',
      'field.unit.classId',
      'field.unit.level',
      'field.unit.exp',
      'field.fe6Unit.characterId',
      'field.fe6Unit.classId',
      'field.fe6Unit.level',
      'field.fe6Unit.exp',
      'field.fe7Unit.characterId',
      'field.fe7Unit.classId',
      'field.fe7Unit.level',
      'field.fe7Unit.exp',
      'field.unit.currentHp',
      'field.unit.maxHp',
      'field.unit.strength',
      'field.unit.skill',
      'field.unit.speed',
      'field.unit.defense',
      'field.unit.resistance',
      'field.unit.luck',
      'field.unit.constitution',
      'field.unit.positionX',
      'field.unit.positionY',
      'field.unit.status',
      'field.unit.affiliation',
      'field.unit.aiFlags',
      'field.unit.stateFlags',
      'field.unit.rescueTarget',
      'field.inventory.convoyItemId',
      'field.inventory.convoyUses',
      'field.progress.chapterState',
      'field.progress.storyFlags',
      'field.progress.routeFlags',
      'field.progress.supportRankBits',
      'field.progress.playthroughFlags',
      'field.progress.worldEventFlags',
      'field.progress.tutorialFlags',
      'field.progress.arenaFlags',
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
