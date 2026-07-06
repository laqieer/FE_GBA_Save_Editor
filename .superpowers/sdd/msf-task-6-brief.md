### Task 6: i18n copy, docs, and full regression gate

**Files:**
- Modify: `src/i18n.ts`
- Modify: `README.md`
- Test: `src/i18n.test.ts`
- Test: `src/lib/structuredEditor.test.ts`
- Test: `src/lib/hexEditor.test.ts`

**Interfaces:**
- Consumes: newly introduced label keys and technical fallback conventions.
- Produces:
  - i18n keys for domain headers, technical-label prefix text, and bitfield labels.
  - README feature text describing meaningful FE6/FE7/FE8 structured editing.

- [ ] **Step 1: Write the failing tests**

```ts
it('contains localization keys for structured domains and technical labels', () => {
  expect(resources.en.translation.structuredDomainUnits).toBeTruthy()
  expect(resources.en.translation.structuredDomainInventory).toBeTruthy()
  expect(resources.en.translation.structuredDomainProgressFlags).toBeTruthy()
  expect(resources.en.translation.technicalFieldLabel).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/i18n.test.ts`
Expected: FAIL for missing keys.

- [ ] **Step 3: Write minimal implementation**

```ts
structuredDomainUnits: 'Units'
structuredDomainInventory: 'Inventory / Convoy'
structuredDomainProgressFlags: 'Progress / Flags'
technicalFieldLabel: 'Technical field: {{memberPath}} (0x{{offset}})'
```

- [ ] **Step 4: Run full verification**

Run: `npm run test:run`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts src/i18n.test.ts src/lib/structuredEditor.test.ts src/lib/hexEditor.test.ts README.md
git commit -m "docs: finalize meaningful structured editor coverage"
```

## Self-Review Checklist

1. **Spec coverage:** All required domains (units, inventory, progress/flags), FE6/FE7/FE8 schema expansion, technical fallback, strict validation, sync/checksum safety, and responsiveness are mapped to Tasks 1-6.
2. **Placeholder scan:** No TODO/TBD placeholders remain; each task has explicit files, tests, code sketch, commands, and commit step.
3. **Type consistency:** `StructuredDomain`, `BlockFieldSchema` metadata fields, and `FieldRow` enrichment are defined in Task 1 and consumed consistently by Tasks 2-6.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-meaningful-structured-fields.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
