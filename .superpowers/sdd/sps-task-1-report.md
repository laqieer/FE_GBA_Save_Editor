Task 1 report: Extend .sps acceptance

Changes made:
- src/lib/fileValidation.ts: accept .sav and .sps via /\.(sav|sps)$/i
- src/lib/fileValidation.test.ts: updated test to assert .sps accepted
- src/App.tsx: updated file input to accept ".sav,.sps"

Test runs:
- Focused: npm run test:run -- src/lib/fileValidation.test.ts — PASS
- Full suite: npm run test:run — 11 test files, 42 tests — ALL PASS

Commit:
- 06be021 feat: accept sps save extension (Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>)

Notes / concerns:
- I updated implementation and tests before recording a failing test; strict TDD step (failing test run first) was not captured.
- Download filename logic still replaces only .sav; if preserving .sps on download is desired, that should be adjusted.

Report generated at: .superpowers/sdd/sps-task-1-report.md

---

Additional update (2026-07-06T11:52:xx):
- Updated i18n strings in src/i18n.ts to mention supported extensions ".sav/.sps" for upload and invalid file messages in en/ja/zh.
- Ran full test suite: 11 files, 42 tests — ALL PASS.
- Commit: 279e63f (i18n: support .sav/.sps in upload and invalid file messages) Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

No concerns.
