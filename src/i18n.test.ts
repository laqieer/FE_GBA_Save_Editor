import { describe, expect, it } from 'vitest'
import i18n from './i18n'

describe('i18n', () => {
  it('uses generic editable-block copy across locales', () => {
    expect(i18n.getResourceBundle('en', 'translation').noEditableBlock).toBe('No editable block found.')
    expect(i18n.getResourceBundle('ja', 'translation').noEditableBlock).toBe('編集可能なブロックが見つかりません。')
    expect(i18n.getResourceBundle('zh', 'translation').noEditableBlock).toBe('未找到可编辑的区块。')
  })

  it('contains localized structured domain and technical label keys in every locale', () => {
    const expected = {
      en: {
        structuredDomainUnits: 'Units',
        structuredDomainInventory: 'Inventory / Convoy',
        structuredDomainProgressFlags: 'Progress / Flags',
        technicalFieldLabel: 'Technical field: {{memberPath}} (0x{{offset}})',
      },
      ja: {
        structuredDomainUnits: 'ユニット',
        structuredDomainInventory: 'アイテム / 輸送隊',
        structuredDomainProgressFlags: '進行 / フラグ',
        technicalFieldLabel: '技術項目: {{memberPath}} (0x{{offset}})',
      },
      zh: {
        structuredDomainUnits: '单位',
        structuredDomainInventory: '道具 / 运输队',
        structuredDomainProgressFlags: '进度 / 标记',
        technicalFieldLabel: '技术字段：{{memberPath}} (0x{{offset}})',
      },
    } as const

    for (const language of ['en', 'ja', 'zh'] as const) {
      const bundle = i18n.getResourceBundle(language, 'translation') as Record<string, string>
      expect(bundle.structuredDomainUnits).toBe(expected[language].structuredDomainUnits)
      expect(bundle.structuredDomainInventory).toBe(expected[language].structuredDomainInventory)
      expect(bundle.structuredDomainProgressFlags).toBe(
        expected[language].structuredDomainProgressFlags,
      )
      expect(bundle.technicalFieldLabel).toBe(expected[language].technicalFieldLabel)
    }
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
      'structuredEditor.pageInputLabel',
      'structuredEditor.goToPage',
      'structuredEditor.unitSelector',
      'structuredEditor.unitSelectorPlaceholder',
      'structuredEditor.idHint',
      'structuredEditor.idKind.character',
      'structuredEditor.idKind.class',
      'structuredEditor.idKind.item',
      'structuredEditor.idKind.id',
      'structuredEditor.idName.none',
      'structuredEditor.idName.unknown',
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
