# Task 1 Brief

Implement codec support for generic byte-range edits for any block.

Files:
- Modify: src/lib/saveCodec.ts
- Modify: src/lib/saveCodec.test.ts
- Create: src/lib/blockCodec.test.ts

Interfaces to produce:
- readBlockBytes(parsed: ParsedSaveFile, blockIndex: number): Uint8Array
- updateBlockBytes(parsed: ParsedSaveFile, blockIndex: number, offsetInBlock: number, patch: Uint8Array): ParsedSaveFile

Validation:
- TDD: failing test first
- Tests: npm run test:run -- src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts
- Build: npm run build
