# Customer Login Module

- Module name: Customer Login
- Category: Security
- Objective: Verify that a valid customer can authenticate and land on the dashboard.
- Scope: Standard web login for customer accounts.
- Preconditions: Valid account exists and login service is available.

## High-Level Actions

- `open_login_page`
- `login_as_customer`
- `open_dashboard`

## Explicit Checks

- `check_dashboard_visible`
- `check_welcome_panel_visible`
- `check_login_error_not_present`

## Data Rows

- Row 1: valid customer credentials
- Row 2: invalid password
- Row 3: locked account

## Human-In-The-Loop Rule

If any `check_*` action fails, summarize the evidence and ask whether the failure should be reported as a bug, marked as a test issue, or held for investigation.