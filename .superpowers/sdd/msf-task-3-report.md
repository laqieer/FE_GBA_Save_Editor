### Task 3 reviewer fix: FE6/FE7 schema separation

Status: DONE

Reviewer finding addressed:
- Removed verbatim FE8 unit-schema reuse from FE6/FE7 save schemas.
- Added separate `buildFe6UnitSchema()` and `buildFe7UnitSchema()` paths with distinct label keys and member paths.
- Kept deterministic `field.tech.*` labels for unnamed legacy unit members.

Files changed:
- `src/lib/blockSchema.ts`
- `src/lib/blockSchema.test.ts`
- `src/lib/structuredEditor.test.ts`
- `src/i18n.ts`
- `src/i18n.test.ts`

Implementation summary:
- FE6 now builds unit rows with `field.fe6Unit.*` labels and `fe6Units[0].*` member paths.
- FE7 now builds unit rows with `field.fe7Unit.*` labels and `fe7Units[0].*` member paths.
- Legacy bytes from `0x34` through `0x44` are emitted as deterministic technical unit rows instead of inheriting FE8 field identities.
- Existing structured edit/checksum behavior stays covered by the unchanged editor regression test.

Focused test evidence:

1. RED (before implementation)

Command:
`npm run test:run -- src\lib\blockSchema.test.ts src\lib\structuredEditor.test.ts`

Result:
- `src/lib/blockSchema.test.ts`: 2 failed
- `src/lib/structuredEditor.test.ts`: 2 failed
- Failure cause: FE6/FE7 rows still exposed FE8-style `field.unit.*` labels and `units[0].*` member paths.

2. GREEN (after implementation)

Command:
`npm run test:run -- src\lib\blockSchema.test.ts src\lib\structuredEditor.test.ts src\i18n.test.ts`

Output:
```text
> fe-gba-save-editor@0.0.0 test:run
> vitest run src\lib\blockSchema.test.ts src\lib\structuredEditor.test.ts src\i18n.test.ts

 RUN  v3.2.6 C:/Projects/FE_GBA_Save_Editor

 ✓ src/lib/blockSchema.test.ts (2 tests) 5ms
 ✓ src/lib/structuredEditor.test.ts (7 tests) 58ms
 ✓ src/i18n.test.ts (2 tests) 7ms

 Test Files  3 passed (3)
      Tests  11 passed (11)
```

Commits created during this reviewer fix:
- None

Concerns:
- FE6/FE7 legacy schemas now avoid FE8 identity reuse, but only the early shared unit fields are given explicit names; later offsets intentionally remain technical until game-specific layout evidence is added.
