export interface ResolvedEditorState {
  selectedBlock: number
  editingBlock: number | null
}

export function resolveEditorState(
  selectedBlock: number,
  editableBlockIndexes: number[],
): ResolvedEditorState {
  return {
    selectedBlock,
    editingBlock: editableBlockIndexes.includes(selectedBlock)
      ? selectedBlock
      : null,
  }
}
