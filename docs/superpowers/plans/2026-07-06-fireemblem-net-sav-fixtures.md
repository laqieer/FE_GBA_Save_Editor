# fireemblem.net SAV Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download and extract all FE07/FE08/FE09 SAVE archives from fireemblem.net into `.sav` fixtures for FE6/FE7/FE8 testing.

**Architecture:** Add a dedicated fireemblem.net downloader that crawls index links, downloads all target archives, extracts `.sav` payloads, and writes provenance metadata. Then wire deterministic tests over extracted fixtures and document FE-number mapping (+1 on source site).

**Tech Stack:** PowerShell scripts, TypeScript, Vitest, Vite

## Global Constraints

- Parse fireemblem.net download index.
- Select SAVE links matching FE07/FE08/FE09 archive entries (`.rar` and `.zip`).
- Download all matching archives.
- Extract every `.sav` file from those archives into test fixtures.
- Record mapping metadata: FE07→FE6, FE08→FE7, FE09→FE8.
- Add deterministic tests over extracted `.sav` fixtures.
- Add docs/provenance for this fixture source.
- Never silently skip archive failures.

---

### Task 1: Build fireemblem.net crawler and archive downloader

**Files:**
- Create: `scripts/tools/download_fireemblem_net_saves.ps1`
- Modify: `test-saves/fireemblem-net/README.md`

**Interfaces:**
- Consumes: source URL `http://www.fireemblem.net/fe/download/index.htm`
- Produces:
  - `test-saves/fireemblem-net/sources/index.html`
  - `test-saves/fireemblem-net/sources/archives/*`
  - `test-saves/fireemblem-net/sources/download-metadata.json`

- [ ] **Step 1: Write the failing test**

```ts
it('has fireemblem.net metadata file with at least one FE07/08/09 archive attempt', async () => {
  const metadata = JSON.parse(await readFile('test-saves/fireemblem-net/sources/download-metadata.json', 'utf8'))
  expect(metadata.archiveAttempts.some((x: { titleCode: string }) => /^FE0[789]/.test(x.titleCode))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because metadata file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```powershell
# parse SAVE/FE07*, SAVE/FE08*, SAVE/FE09* links from index
$matches = [regex]::Matches($html, 'SAVE/(FE0[789][^"''\s>]+?\.(rar|zip))', 'IgnoreCase')
```

```powershell
# record all attempts with FE mapping
@{
  titleCode = 'FE07'
  mappedGameCode = 'FE6'
  archiveUrl = $url
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: PASS for metadata existence/shape test.

- [ ] **Step 5: Commit**

```bash
git add scripts/tools/download_fireemblem_net_saves.ps1 test-saves/fireemblem-net/README.md
git commit -m "test: add fireemblem.net archive crawler"
```

### Task 2: Extract all `.sav` payloads from `.rar`/`.zip` archives

**Files:**
- Modify: `scripts/tools/download_fireemblem_net_saves.ps1`
- Create: `test-saves/fireemblem-net/.gitkeep`
- Modify: `test-saves/fireemblem-net/README.md`

**Interfaces:**
- Consumes: downloaded archives from Task 1
- Produces:
  - extracted `.sav` files under `test-saves/fireemblem-net/`
  - per-archive extraction result in metadata

- [ ] **Step 1: Write the failing test**

```ts
it('includes extracted fireemblem.net .sav fixtures', async () => {
  const files = await readdir('test-saves/fireemblem-net')
  expect(files.some((name) => name.toLowerCase().endsWith('.sav'))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because no extracted `.sav` fixtures exist.

- [ ] **Step 3: Write minimal implementation**

```powershell
# zip fallback
Expand-Archive -Path $archivePath -DestinationPath $tempExtract -Force

# rar extraction if 7z exists
& 7z x -y "-o$tempExtract" $archivePath | Out-Null

# copy all .sav files
Get-ChildItem -Path $tempExtract -Recurse -File -Filter *.sav | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $fixtureRoot $_.Name) -Force
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: PASS with at least one `.sav` extracted.

- [ ] **Step 5: Commit**

```bash
git add scripts/tools/download_fireemblem_net_saves.ps1 test-saves/fireemblem-net/README.md test-saves/fireemblem-net/*.sav
git commit -m "test: extract all fireemblem.net sav fixtures"
```

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
