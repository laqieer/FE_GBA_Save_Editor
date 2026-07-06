### Task 3: Add deterministic parser coverage and root docs

**Files:**
- Modify: `src/lib/saveCodec.test.ts`
- Modify: `README.md`
- Modify: `test-saves/fireemblem-net/README.md`

**Interfaces:**
- Consumes: extracted `.sav` fixtures + metadata mapping
- Produces:
  - parser regression test over all fixtures
  - root docs for fixture source and FE07/08/09 mapping

- [ ] **Step 1: Write the failing test**

```ts
it('parses every fireemblem.net sav fixture with mapped FE code', async () => {
  const metadata = JSON.parse(await readFile('test-saves/fireemblem-net/sources/download-metadata.json', 'utf8'))
  for (const fixture of metadata.extractedFixtures) {
    const bytes = await readFile(resolve('test-saves/fireemblem-net', fixture.fileName))
    const parsed = await parseSaveFile(new File([bytes], fixture.fileName))
    expect(parsed.gameCode).toBe(fixture.mappedGameCode)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL before parser fixture loop exists.

- [ ] **Step 3: Write minimal implementation**

```md
## Additional real-world .sav fixtures
- fireemblem.net SAVE page (`FE07/08/09` map to `FE6/7/8`)
- archives are downloaded and extracted by `scripts/tools/download_fireemblem_net_saves.ps1`
```

- [ ] **Step 4: Run full verification**

Run: `npm run test:run`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/saveCodec.test.ts README.md test-saves/fireemblem-net/README.md
git commit -m "test: add fireemblem.net sav fixture parser coverage"
```

## Self-Review Checklist

1. **Spec coverage:** crawler/download (Task 1), extraction of all `.sav` (Task 2), parser tests + docs + FE mapping (Task 3).
2. **Placeholder scan:** all tasks include explicit files, code snippets, commands, and commit steps.
3. **Type consistency:** metadata fields (`titleCode`, `mappedGameCode`, `extractedFixtures`) are used consistently across script and tests.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-fireemblem-net-sav-fixtures.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
