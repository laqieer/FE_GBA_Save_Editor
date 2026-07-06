# Task 1 Implementer Report

Status: DONE

Changes:
- src/lib/saveCodec.ts
- src/lib/saveCodec.test.ts
- src/lib/blockCodec.test.ts

Commands + outcomes:
- npm run test:run -- src/lib/saveCodec.test.ts : PASS
- npm run test:run -- src/lib/blockCodec.test.ts : FAIL first (TDD red)
- npm run test:run -- src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts : PASS (8/8)
- npm run build : PASS

Commit:
- 0baa7a739bed55d86b80c48808a85604e73b5d00

Concerns: None
