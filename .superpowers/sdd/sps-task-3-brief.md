### Task 3: Add GameFAQs fixture workflow and docs updates

**Files:**
- Create: `scripts\tools\download_gamefaqs_saves.ps1`
- Create: `test-saves\gamefaqs\README.md`
- Modify: `README.md`
- Modify: `src/lib/saveCodec.test.ts`

**Interfaces:**
- Consumes: manual invocation script input URLs
- Produces:
  - fixture directory: `test-saves/gamefaqs/`
  - extracted `.sav`/`.sps` sample files for regression tests
  - README guidance for fixture download and limitations

- [ ] **Step 1: Write failing/coverage test**

```ts
it('parses at least one real-world fixture from gamefaqs directory', async () => {
  const fixture = await readFixture('test-saves/gamefaqs/fe8-real-sample.sps')
  const parsed = await parseSaveFile(new File([fixture], 'fe8-real-sample.sps'))
  expect(parsed.generalChecksumValid).toBeTypeOf('boolean')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because fixture and/or decode flow is missing.

- [ ] **Step 3: Write implementation + fixture docs**

```powershell
param([string[]]$Urls)
# Download HTML/files for the 3 provided GameFAQs save pages.
# Save raw downloads under test-saves\gamefaqs\sources\
# Extract reachable archives; copy usable .sav/.sps samples into test-saves\gamefaqs\
```

```md
# test-saves/gamefaqs
- Source URLs
- Download timestamp
- Any blocked URLs and HTTP status
- Fixture provenance mapping
```

- [ ] **Step 4: Run full verification**

Run: `npm run test:run`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/tools/download_gamefaqs_saves.ps1 test-saves/gamefaqs README.md src/lib/saveCodec.test.ts
git commit -m "test: add gamefaqs real save fixtures and workflow"
```

## Self-Review Checklist

1. **Spec coverage:** Task 1 handles extension acceptance; Task 2 handles SPS decode + fail-closed behavior; Task 3 handles GameFAQs fixture workflow and docs.
2. **Placeholder scan:** No TODO/TBD placeholders remain; each step includes explicit files, tests, commands, and commit.
3. **Type consistency:** `parseSaveFile` normalization path and `.sps` extension acceptance are consistent across validation, parse flow, and tests.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-gamefaqs-sps-support.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
