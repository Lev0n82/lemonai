# LemonAI Testing Instructions

All testing, test automation, QA execution, Playwright work, browser automation, English-written test case conversion, and defect reporting in this repository must follow Action-Based Testing (ABT).

Required behavior:

- Convert freeform or English-written test requests into ABT artifacts before implementation or execution.
- Use business-facing actions and explicit `check_*` actions.
- Keep test logic separate from test data, business actions separate from technical implementation, and test definition separate from execution.
- Keep the three layers distinct: high-level intent, mid-level functional actions, low-level mechanics.
- Use Playwright or browser tooling only as the low-level execution layer.
- Centralize locators and low-level mechanics instead of embedding them in high-level tests.
- Keep self-healing limited to low-level repair. Do not auto-change business intent or expected outcomes without human review.
- Report failures as ABT outcomes with objective, scenario, failed action or check, expected result, actual result, and evidence.

Forbidden behavior:

- Raw click-by-click scripting as the primary test design
- Hardcoded selectors or brittle DOM paths in business-level tests
- Hidden assertions inside helper actions
- Vague goals such as "test everything"
- Swiss-army-knife actions that mix multiple unrelated responsibilities

When testing work is requested, consult [action-based-testing skill](.github/skills/action-based-testing/SKILL.md) and its references before proceeding.