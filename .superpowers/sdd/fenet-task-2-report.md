Status: completed

Commits:
- 1796beb: test: extract all fireemblem.net sav fixtures (modified downloader to extract .sav, added sample fixture and .gitkeep, updated tests and README)

One-line tests:
- Focused: src/lib/saveCodec.test.ts — 15 passed
- Full suite: vitest run — 50 passed

Concerns:
- Extraction uses Expand-Archive and falls back to 7z if available; systems without 7z may not extract .rar archives automatically.

Report path: .superpowers/sdd/fenet-task-2-report.md

---
Update: fixed Task2 review findings on 2026-07-06

Status: completed

Changes:
- downloader now assigns deterministic extracted fixture names, records extractor + extracted entries in metadata, and exits non-zero when any archive download/extraction fails
- removed synthetic `test-saves/fireemblem-net/sample.sav`
- saveCodec tests now assert committed real fireemblem.net fixtures via metadata + parsed fixture properties
- fireemblem-net README now documents mandatory `.rar` extraction requirements

Verification:
- Focused: `npm run test:run -- src/lib/saveCodec.test.ts` -> 18 passed
- Full: `npm run test:run` -> 53 passed
- Build: `npm run build` -> success
- Manual failure check: downloader exits non-zero when PATH omits `7z`/`tar` for `.rar`

Code review:
- reviewer assessment: With fixes
- follow-up applied: added committed real extracted fixtures required by the new tests
