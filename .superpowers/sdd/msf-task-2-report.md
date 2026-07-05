Status: DONE

Commits created:
- feat: add FE8 unit inventory and progress structured schemas

One-line test summary:
Full suite passed: 8 files, 32 tests, 0 failures.

Self-review:
- FE8 block kinds 0 and 1 now expose grouped unit, inventory, and progress rows.
- Structured edits still flow through updateBlockBytes and preserve checksum validity.
- Invalid edit behavior remains non-mutating through existing validation paths.
- New labels are localized for EN/JA/ZH so the structured view stays readable.

Concerns:
- None.

Report file path:
C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\msf-task-2-report.md
