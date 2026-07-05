import { describe, expect, it } from 'vitest'
import {
  buildEditorBlockKey,
  getEditableBlockIndexes,
  resolveEditorState,
} from './editorState'

describe('resolveEditorState', () => {
  it('does not force selected block back to first editable block', () => {
    const state = resolveEditorState(5, [0, 1, 3, 4])
    expect(state.selectedBlock).toBe(5)
    expect(state.editingBlock).toBeNull()
  })

  it('treats every parsed block as editable when generic block editing is enabled', () => {
    const resolveEditableIndexes = getEditableBlockIndexes as (
      parsed: {
        bytes: Uint8Array
        blocks: Array<{
          index: number
          kind: number
          magic32: number
          offset: number
          size: number
        }>
      },
    ) => number[]
    const editableIndexes = resolveEditableIndexes({
      bytes: new Uint8Array(0x1200),
      blocks: Array.from({ length: 7 }, (_, index) => ({
        index,
        kind: index,
        magic32: 0x40624 + index,
        offset: 0x0200 + index * 0x0100,
        size: 0x0080,
      })),
    })

    expect(editableIndexes).toEqual([0, 1, 2, 3, 4, 5, 6])
    for (const blockIndex of editableIndexes) {
      expect(resolveEditorState(blockIndex, editableIndexes)).toEqual({
        selectedBlock: blockIndex,
        editingBlock: blockIndex,
      })
    }
  })

  it('keeps absent blocks read-only when generic block editing is enabled', () => {
    const resolveEditableIndexes = getEditableBlockIndexes as (
      parsed: {
        bytes: Uint8Array
        blocks: Array<{
          index: number
          kind: number
          magic32: number
          offset: number
          size: number
        }>
      },
    ) => number[]
    const editableIndexes = resolveEditableIndexes({
      bytes: new Uint8Array(0x1200),
      blocks: Array.from({ length: 7 }, (_, index) => ({
        index,
        kind: index === 6 ? 0xff : index,
        magic32: index === 6 ? 0 : 0x40624 + index,
        offset: 0x0200 + index * 0x0100,
        size: 0x0080,
      })),
    })

    expect(editableIndexes).toEqual([0, 1, 2, 3, 4, 5])
    expect(resolveEditorState(6, editableIndexes)).toEqual({
      selectedBlock: 6,
      editingBlock: null,
    })
  })

  it('changes editor block key when loading a new save on the same block', () => {
    expect(buildEditorBlockKey(1, 0)).toBe('1:0')
    expect(buildEditorBlockKey(2, 0)).toBe('2:0')
  })
})
