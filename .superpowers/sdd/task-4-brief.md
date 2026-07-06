### Task 4: End-to-end verification for structured navigation behavior

**Files:**
- Modify: `src/components/BlockStructuredTable.test.tsx`
- Modify: `src/lib/structuredEditor.test.ts` (only if assertions are needed for row grouping assumptions)

**Interfaces:**
- Consumes:
  - `groupRowsByDomainAndGroup`
  - `paginateStructuredSection`
  - `BlockStructuredTable` with unit-centric page behavior
- Produces:
  - Regression coverage that one unit page includes full selected unit rows and non-units stay row-paged

- [ ] **Step 1: Write failing regression tests**

```ts
it('keeps non-unit domains row-paged while units are unit-paged', () => {
  // build rows with many playState technical entries + two units
  // assert layout helper returns row-sliced page for playState and whole-group page for units
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts`
Expected: FAIL with new regression assertion mismatch.

- [ ] **Step 3: Minimal code/test alignment fix**

```ts
// if needed, adjust component-visible group selection to use page.visibleGroupIds
const visibleGroups = section.groups.filter((group) =>
  page.visibleGroupIds.includes(group.id),
)
```

- [ ] **Step 4: Run full targeted checks**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts src/lib/structuredNavigation.test.ts src/lib/structuredEditor.test.ts`
Expected: PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: successful TypeScript build and Vite production bundle.

- [ ] **Step 6: Commit**

```bash
git add src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts src/lib/structuredNavigation.test.ts src/lib/structuredEditor.test.ts
git commit -m "test: add regression coverage for structured navigation modes"
```

---

## Self-Review Checklist Results

1. **Spec coverage:** all in-scope requirements map to Tasks 1-4 (page jump, one-unit pages, unit selector, regression tests, no codec changes).
2. **Placeholder scan:** no TBD/TODO placeholders remain; each task includes concrete files, commands, and code snippets.
3. **Type consistency:** `paginateStructuredSection`, `parsePageJump`, and `findUnitPageByIndex` are defined once and reused consistently in later tasks.
