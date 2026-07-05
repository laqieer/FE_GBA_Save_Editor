import { describe, expect, it } from 'vitest'
import { resolveEditorState } from './editorState'

describe('resolveEditorState', () => {
  it('does not force selected block back to first editable block', () => {
    const state = resolveEditorState(5, [0, 1, 3, 4])
    expect(state.selectedBlock).toBe(5)
    expect(state.editingBlock).toBeNull()
  })
})
