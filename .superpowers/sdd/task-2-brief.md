# Task 2 Brief

Build structured field schema + row generation for full-block view.

Files:
- Create: src/lib/blockSchema.ts
- Create: src/lib/structuredEditor.ts
- Create: src/lib/structuredEditor.test.ts
- Modify: src/lib/saveCodec.ts

Consumes from Task 1:
- readBlockBytes(parsed, blockIndex)
- updateBlockBytes(parsed, blockIndex, offsetInBlock, patch)

Interfaces to produce:
- type FieldRow = { key: string; offset: number; size: 1|2|4; type: "u8"|"s8"|"u16"|"u32"|"bytes"|"text"; labelKey: string; value: number|string }
- getStructuredRows(parsed: ParsedSaveFile, blockIndex: number): FieldRow[]
- applyStructuredEdit(parsed: ParsedSaveFile, blockIndex: number, rowKey: string, nextValue: string): ParsedSaveFile

Validation requirements:
- Known PlaySt fields must appear via schema rows for game/suspend blocks.
- Unknown regions must be represented by generic byte rows so whole block is editable.
- applyStructuredEdit must validate type bounds and reject invalid inputs without mutating canonical bytes.

Verification commands:
- npm run test:run -- src/lib/structuredEditor.test.ts
- npm run test:run -- src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts src/lib/structuredEditor.test.ts
- npm run build

Commit:
- feat: add structured full-block row model
