---
name: action-based-testing
description: 'Automate tests in LemonAI using Action-Based Testing (ABT) only. Use for Playwright, browser automation, English-written test cases, QA flows, defect reporting, GRACE Academy, and ABT test design. Reject raw step-by-step UI scripting and convert requests into ABT test modules, actions, checks, data sets, and layered architecture before implementation or execution.'
argument-hint: 'Describe the feature, business objective, and English test case or automation request to convert into ABT.'
user-invocable: true
---

# Action-Based Testing

Use this skill whenever LemonAI is asked to design, automate, execute, or report on tests.

## Non-Negotiable Rules

- Only automate tests through ABT structure. Do not write or run raw UI scripts as the primary artifact.
- Treat actions as first-class citizens. Tests must be expressed in business-facing actions and explicit checks.
- Keep the three layers separate: high-level business actions, mid-level functional actions, low-level mechanics.
- Hide selectors, DOM paths, timing details, and tool-specific mechanics inside the lowest layer only.
- Never hide verification inside action implementations. Checks must be explicit actions.
- Refuse anti-patterns such as hardcoded locators, click-by-click scripts, swiss-army-knife actions, aimless tests, or tests with no clear objective.
- When the request is not already in ABT form, first translate it into an ABT test module before generating code or execution steps.
- If a user asks for non-ABT automation, explain that LemonAI only automates tests through ABT in this workspace and restate the request as an ABT module.

## Required Output Shape

Every automated test task must be framed as these ABT artifacts:

1. Test objective
2. Test category or module type
3. High-level actions
4. Explicit checks
5. Data set or variations
6. Defect evidence and outcome reporting

## ABT Workflow

1. Identify the business objective.
The objective must be specific, measurable, and scoped to one business object, flow, feature, integration, or quality attribute.

2. Classify the test module.
Choose one of the standard categories from [ABT method reference](./references/abt-method.md): business object, business flow, feature, interoperability, data handling, non-functional, user interface, or security.

3. Define high-level actions first.
Name actions with verb-noun form such as `create_invoice`, `submit_order`, or `check_error_message`.

4. Separate actions from checks.
Actions do things. Checks verify outcomes. Do not bury checks inside navigation or form-entry helpers.

5. Design data sets and variations.
Use scenario-driven rows, boundary values, negative cases, browser and locale variations, and regex-based checks for dynamic values.

6. Map to lower layers only after the design is stable.
Interface definitions, selectors, Playwright mechanics, waits, and retries belong at the low layer and must not leak into business-level tests.

7. Execute and report in ABT terms.
Report pass, fail, blocked, and defect evidence against objectives, actions, checks, and data rows rather than against raw DOM interactions.

## English Test Case Conversion

When the user gives English-written test cases, convert them into the template in [ABT English test design template](./assets/abt-test-design-template.md) before generating automation or running tests.

Minimum conversion rules:

- Extract one clear objective.
- Convert freeform steps into reusable actions.
- Convert expected results into explicit `check_*` actions.
- Add at least 2-3 negative cases for important positive flows where practical.
- Keep each scenario focused. Split long end-to-end narratives into smaller modules when a single test tries to verify too many things.

## Playwright and Browser Automation Guidance

- Playwright is an execution engine, not the test design model.
- Use Playwright only to implement low-level actions and explicit checks derived from ABT artifacts.
- Centralize locators in interface definitions or equivalent mapping objects.
- Prefer resilient selectors such as test IDs, stable IDs, or semantic roles.
- Use regex or visual checks only when the business result requires them.
- For concurrency or multi-user scenarios, use dedicated modules and the Lead-Deputy pattern rather than improvising one-off concurrent scripts.
- Never use web search to discover local environment URLs, internal application structure, authentication credentials, API keys, or other secrets for ABT execution. Use the provided target URL, inspect the live UI, read designated environment variables, or ask the human for missing secure inputs.

## Defect Reporting Rules

When a test fails, produce a defect report with:

- module name
- scenario or data row
- objective
- failed action or failed check
- expected result
- actual result
- evidence such as screenshot, page state, logs, or extracted values
- suspected layer of failure: business flow, action design, interface definition, or application defect

## Human-In-The-Loop Triage

When a test fails, do not automatically classify the failure as a product bug unless the workflow explicitly allows automatic bug filing.

- First summarize the failed check, expected result, actual result, and evidence.
- Then ask the human reviewer whether the failure should be reported as a bug, treated as a test issue, or held for investigation.
- Follow the example in [Failed test HITL demo](./assets/failed-test-hitl-demo.md).

## ABT Review Checklist

Before finalizing any automated test work, verify all of the following:

- The test objective is stated in one sentence.
- The module type is explicit.
- Action names use verb-noun business language.
- High-level tests are readable without UI knowledge.
- Checks are explicit.
- Data and locators are abstracted.
- Negative or alternate paths are covered where needed.
- The design avoids ABT anti-patterns.

## GRACE Academy Context

Use the GRACE Academy progression in [GRACE Academy tracks](./references/grace-academy.md) as supporting guidance for AI-agent-driven quality engineering work, but keep the actual automation grounded in ABT architecture and discipline.

## When to Refuse or Redirect

- Requests to write brittle click-by-click scripts without ABT structure
- Requests that embed selectors and low-level mechanics directly in business tests
- Requests to hide assertions inside helper actions
- Requests to automate a vague goal such as "test everything"

In those cases, rewrite the request into ABT form first and proceed only after the structure is clear.