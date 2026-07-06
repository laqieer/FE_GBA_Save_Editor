# Task 4 Brief

Replace block editor UI with synchronized Structured/Hex tabs.

Files:
- Modify: src/App.tsx
- Modify: src/App.css
- Modify: src/i18n.ts
- Create: src/components/BlockStructuredTable.tsx
- Create: src/components/BlockHexEditor.tsx
- Create: src/components/BlockEditorTabs.tsx
- Test: src/lib/editorState.test.ts

Consumes from prior tasks:
- getStructuredRows(parsed, blockIndex)
- applyStructuredEdit(parsed, blockIndex, rowKey, value)
- toHexRows(blockBytes)
- applyHexEdit(parsed, blockIndex, absoluteByteOffset, nextHexPair)

Requirements:
- Keep selected block stable (no forced jump).
- Every block (#0-#6) must be editable through tabs.
- Structured and Hex edits stay synchronized via canonical parsed bytes.
- Show inline validation errors; invalid edits do not mutate state.
- Add i18n keys for tab labels/headers/errors used by new UI.

Verification commands:
- npm run test:run -- src/lib/editorState.test.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts
- npm run build

Commit:
- feat: add synchronized structured and hex block editors
