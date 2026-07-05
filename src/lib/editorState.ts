export interface ResolvedEditorState {
  selectedBlock: number
  editingBlock: number | null
}

interface EditableBlockLike {
  index: number
  kind: number
  magic32: number
  offset: number
  size: number
}

interface EditableBlockSource<TBlock extends EditableBlockLike = EditableBlockLike> {
  bytes: Uint8Array
  blocks: readonly TBlock[]
}

function isEditableBlock(block: EditableBlockLike, byteLength: number): boolean {
  return (
    block.size > 0 &&
    block.offset > 0 &&
    block.offset + block.size <= byteLength &&
    block.magic32 !== 0 &&
    block.kind !== 0xff
  )
}

export function getEditableBlockIndexes<TBlock extends EditableBlockLike>(
  parsed: EditableBlockSource<TBlock>,
): number[] {
  return parsed.blocks
    .filter((block) => isEditableBlock(block, parsed.bytes.length))
    .map((block) => block.index)
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

export function buildEditorBlockKey(
  saveRevision: number,
  blockIndex: number,
): string {
  return `${saveRevision}:${blockIndex}`
}
