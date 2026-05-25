# Failed Test Human-In-The-Loop Demo

Use this example when the user wants LemonAI to demonstrate how an English-written test case becomes an ABT test module, how a failure is reported, and how a human is asked whether the failure should be filed as a bug.

## Example Input

```text
Test case: Verify that a customer can log in with valid credentials and land on the dashboard.

Steps:
1. Open the login page.
2. Enter a valid username and password.
3. Click Sign In.
4. Verify that the dashboard is displayed.

Expected result:
The user is redirected to the dashboard and sees the welcome panel.
```

## ABT Conversion

### Test Module

- Module name: Customer Login
- Category: Security
- Objective: Verify that a valid customer can authenticate successfully and reach the dashboard.
- Scope: Web login flow for standard customer accounts.
- Preconditions: Valid test account exists and login service is available.

### Actions Inventory

- High-level actions:
  `open_login_page`
  `login_as_customer`
  `open_dashboard`
- Mid-level actions:
  `enter_username`
  `enter_password`
  `submit_login`
- Low-level implementation notes:
  Playwright locates the username field, password field, submit button, and dashboard markers using stable selectors.

### Explicit Checks

- `check_dashboard_visible`
- `check_welcome_panel_visible`
- `check_login_error_not_present`

### Data Design

- Data row 1: valid customer credentials
- Negative row 1: invalid password
- Negative row 2: locked account

## Example Execution Narrative

### Positive Case

- Setup:
  `open_login_page`
- Action:
  `login_as_customer(username: [valid_user], password: [valid_password])`
- Verification:
  `check_dashboard_visible`
  `check_welcome_panel_visible`
  `check_login_error_not_present`

## Example Failed Result

Assume the test runs and fails.

### Failure Summary

- Status: fail
- Failed check: `check_dashboard_visible`
- Expected result: Customer is redirected to the dashboard and sees the welcome panel.
- Actual result: Customer remains on the login page and an empty loading state persists for 30 seconds.
- Evidence:
  Screenshot shows login form still visible.
  Browser log shows `POST /api/login 200` followed by client-side route error.
  URL remains `/login` instead of `/dashboard`.
- Suspected layer: application defect

## Human-In-The-Loop Decision Step

At this point LemonAI should not automatically file a bug. It should ask the human reviewer a direct triage question.

### Example Prompt To Human

```text
The test case "Customer Login" failed.

Failed check:
- check_dashboard_visible

Expected result:
- User lands on the dashboard and sees the welcome panel.

Actual result:
- User stays on the login page after a successful login response.

Evidence:
- Login API returned 200.
- Client-side route did not transition to /dashboard.
- Welcome panel never appeared.

Should this failure be reported as a bug?

Reply with one of:
- Yes, report bug
- No, mark as test issue
- Needs investigation
```

## Example Outcomes

### If Human Says "Yes, report bug"

Create a defect record:

- Title: Successful login does not redirect customer to dashboard
- Severity: High
- Module: Customer Login
- Failing check: `check_dashboard_visible`
- Expected result: Redirect to dashboard with welcome panel
- Actual result: User remains on login page after successful authentication
- Evidence: screenshot, route state, console log, network log

### If Human Says "No, mark as test issue"

Record the result as non-product failure:

- Final classification: test issue
- Reason: selector drift, unstable environment, invalid data, or incorrect expected result
- Required action: update test asset or environment before rerun

### If Human Says "Needs investigation"

Record a triage hold:

- Final classification: pending triage
- Next action: gather more evidence
- Suggested evidence: rerun with console log capture, route trace, and a second account

## Expected LemonAI Behavior

- Convert the test case to ABT first.
- Execute using explicit actions and checks.
- When a failure occurs, summarize the failed check and evidence.
- Ask the human whether the failure should be reported as a bug.
- Do not auto-file a bug unless the workflow explicitly authorizes automatic bug filing.