# ABT English Test Design Template

Use this template to translate an English-written test case into ABT before implementing or executing it.

## Test Module

- Module name:
- Category: Business Object | Business Flow | Feature | Interoperability | Data Handling | Non-Functional | User Interface | Security
- Objective:
- Scope:
- Preconditions:

## Actions Inventory

- High-level actions:
- Mid-level actions:
- Low-level implementation notes:

## Explicit Checks

- `check_*` actions for expected outcomes:
- Negative checks or error checks:
- Optional regex, visual, or OCR checks:

## Data Design

- Data set rows:
- Boundary values:
- Invalid values:
- Variations: browser, role, locale, environment, device

## Scenario Cases

### Positive Case

- Setup:
- Action:
- Verification:

### Negative Case 1

- Setup:
- Action:
- Verification:

### Negative Case 2

- Setup:
- Action:
- Verification:

## Defect Reporting Format

- Status: pass | fail | blocked
- Failed action or check:
- Expected result:
- Actual result:
- Evidence:
- Suspected layer: business flow | action design | interface definition | application defect

## Translation Rules

- Replace raw UI instructions with reusable actions.
- Replace prose expectations with explicit checks.
- Split multi-purpose scenarios into smaller modules.
- Keep selectors, waits, and tool mechanics out of the high-level design.