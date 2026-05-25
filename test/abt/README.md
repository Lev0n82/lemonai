# ABT Test Assets

This folder stores Action-Based Testing design artifacts that define what should be tested before Playwright or any other execution layer is written or run.

## Purpose

- Store ABT test modules
- Store reusable data sets and variations
- Store triage notes and human-in-the-loop defect decisions
- Keep business intent separate from Playwright implementation

## Suggested Structure

- `modules/` for ABT module definitions
- `datasets/` for reusable data rows and variations
- `triage/` for failed-test review notes and defect decisions

## Naming

- ABT module files: `<domain>-<flow>.module.md`
- Data files: `<domain>-<flow>.data.json`
- Triage files: `<domain>-<flow>.triage.md`

## Mapping To Playwright

Each ABT module in `test/abt/modules/` should map to one or more Playwright specs in `test/e2e/`.

Example:

- `test/abt/modules/customer-login.module.md`
- `test/e2e/customer-login.abt.spec.js`