# Task 3 Brief

Add editable hex model and sync pipeline.

Files:
- Create: src/lib/hexEditor.ts
- Create: src/lib/hexEditor.test.ts
- Modify: src/lib/structuredEditor.ts

Consumes:
- readBlockBytes(parsed, blockIndex)
- updateBlockBytes(parsed, blockIndex, offsetInBlock, patch)

Interfaces to produce:
- toHexRows(blockBytes: Uint8Array, bytesPerRow?: number): { rowOffset: number; hex: string[]; ascii: string }[]
- applyHexEdit(parsed: ParsedSaveFile, blockIndex: number, absoluteByteOffset: number, nextHexPair: string): ParsedSaveFile

Requirements:
- Strict hex-byte validation (`00`-`FF` only).
- Invalid hex edits must throw and not mutate bytes.
- Successful hex edit must recompute block/global checksums through codec path.
- Keep structured pipeline compatible (no regressions).

Verification commands:
- npm run test:run -- src/lib/hexEditor.test.ts
- npm run test:run -- src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts
- npm run build

Commit:
- feat: add hex editor model and edit pipeline
