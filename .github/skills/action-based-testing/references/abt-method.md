# ABT Method Reference

This reference summarizes the public Action-Based Testing material from learnsdlc.org and converts it into operational rules for LemonAI.

## Module 1: The Testing Paradox

- Prefer logical actions like `login("admin", "1234")` over raw click-and-type scripts.
- Fix reuse at the action definition level, not in every test.
- Structured tests reduce maintenance cost and make intent readable.

## Module 2: The Three Layers

- High level: business goals such as `purchase_product`.
- Mid level: functional steps such as `login`, `checkout`, `add_to_cart`.
- Low level: mechanics such as click, type, and locator resolution.
- A higher layer must hide the implementation details of the layer below it.
- UI changes should usually require a low-level fix only.

## Module 3: Common Anti-Patterns

- Avoid the enter-enter-click fallacy: too much mechanical detail.
- Avoid clueless tests: every test must have a clear purpose.
- Avoid swiss-army-knife actions: each action has one purpose.

## Module 4: Architecture

- Organize tests as modules, not as a flat pile of scripts.
- Use business object modules for CRUD and entity behavior.
- Use business flow modules for cross-object end-to-end goals.
- If a test cannot be located quickly by logic, the structure is wrong.

## Module 5: Language of Logic

- Use verb-noun naming.
- Use business terminology, not technical jargon.
- Keep action arguments simple.
- Maintain a mapping layer from logical names to technical identifiers.

## Module 6: Test Life-Cycle

- Treat system development, test design, and automation implementation as parallel life-cycles.
- Tests can be designed before automation exists.
- Automation follows stable test design, not the other way around.
- Finalize interface definitions late because they are volatile.
- Run what is automated and handle remaining gaps explicitly.
- Use cross-over modules to verify new features against existing modules.

## Module 7: Building Test Modules

- Start with a clear objective.
- Inventory actions before writing cases.
- Keep checks explicit.
- Build data sets around scenarios, boundary values, and business rules.
- Write test cases as setup, action, verification.
- Use decision tables when multiple conditions affect outcomes.

## Module 8: Advanced Techniques

- Use variations to avoid duplicating tests across browsers, locales, environments, and roles.
- Use regex-based checks for dynamic values.
- Use visual verification carefully with tolerance and ignored dynamic regions.
- Reuse shared modules across projects when functionality is common.
- Use predefined and query-based suites to organize execution.

## Module 9: Anti-Pattern Gallery

The main anti-patterns to reject are:

- Hardcoded
- Spaghetti
- Klunky
- Lifeless
- Lame
- Clueless
- Sneaky Checking
- Action Explosion
- Techno
- Endless
- Swiss Army Knife
- Over-Checking
- Fragile Locators

Diagnostic rules:

- Do not hardcode selectors or test data in business tests.
- Keep action hierarchies shallow.
- Keep high-level tests readable to non-technical stakeholders.
- Cover CRUD, state changes, negative cases, and explicit objectives.
- Keep checks visible and separate.
- Parameterize reusable actions.
- Prefer stable identifiers via interface definitions.

## Module 10: Test Design Template

Organize coverage using these categories:

- Business Objects
- Business Flows
- Features
- Interoperability
- Data Handling
- Non-Functional
- User Interface
- Security

Recommended design process:

1. Inventory business objects.
2. Map business flows.
3. Catalog cross-cutting features.
4. Identify integrations.
5. Define non-functional requirements.
6. Apply coverage checklists.

Concurrency guidance:

- Use dedicated modules for concurrency.
- Use the Lead-Deputy pattern for multi-user scenarios.
- Treat concurrency as a first-class design concern, not an afterthought.