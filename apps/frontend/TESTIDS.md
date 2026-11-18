# Frontend test-id conventions

All ids are `data-testid`, kebab-case. `<email>` is the customer's email (e.g. `anna.smirnova@example.com`),
`<id>` is the entity uuid. Playwright: `page.getByTestId('...')`. App URL: http://localhost:5180.

## General rules

- Where antd renders the control (Select, Table, Modal, Drawer), `data-testid` sits on the antd **root/wrapper element**, not on the inner `<input>`.
  - **Select**: click the wrapper (`getByTestId('x')`), then click the option: `page.locator('.ant-select-dropdown:visible .ant-select-item-option', {hasText:'VERIFIED'})`.
    (Do NOT use `getByRole('option')` / `getByText` on the dropdown: antd adds a hidden a11y duplicate that is not clickable or causes strict-mode violations.)
    Searchable selects (customers/accounts, `showSearch`): click wrapper, `page.keyboard.type('maria')`, then click the option by the same locator.
    Dropdowns render in `document.body` (`.ant-select-dropdown`), animations are short.
  - Customer option text: `First Last (email)`. Account option text: `Name - Customer Name - EUR €2,500.00` (+ ` [FROZEN]` / ` [CLOSED]` suffix when not ACTIVE). Use a substring/regex match.
- Inputs (`Input`, `InputNumber`, `TextArea`, `<input type=date>`): testid is on the `<input>`/`<textarea>` itself, so `.fill()` works. Date inputs take `YYYY-MM-DD`.
- **Modals/Drawer**: the testid sits on a `div` wrapper rendered via `modalRender` / `drawerRender` (antd's own root element has zero size, so Playwright reports it hidden).
  It is visible while open and removed/hidden when closed.
- **Select virtualisation**: option lists render only the visible ~8 rows, so options far down the list (e.g. an account that is not near the top) are not in the DOM until you type to filter. Always type the search text for customer/account selects.
- **Prefix collisions**: `customer-kyc-<email>` is also a prefix of `customer-kyc-verify-<email>` / `customer-kyc-reject-<email>` (same for `customer-accounts-`). Don't use `[data-testid^=customer-kyc-]` alone to select tags.
- E2E animation tip: don't set `animation-duration: 0s` / `transition-duration > 0` globally (breaks antd modal leave and popup positioning); use `transition: none` + `animation-duration: 0.001s`.
- Table rows `*-row-*` are `<tr>`. Cells carry their own ids (see below). Tables: pagination is antd's standard `.ant-pagination` inside the table (no testids).
- Row actions that don't apply are **not rendered** (e.g. no `tx-approve-<id>` unless the tx is PENDING). They are not disabled.
- Money is formatted en-US with currency symbol: `$1,234.50`, `€2,500.00`, `£0.00`.
- Dates are `YYYY-MM-DD HH:mm`.
- Toasts (antd message): `toast-success` / `toast-error` (span inside the message). Success text is written by the UI (e.g. `Customer x@y.z created`),
  error text is the **server `message`** verbatim (validation arrays joined by `; `).
  Assert table state rather than toasts where possible; toasts disappear after 4-6 s.
- Confirm dialogs (delete customer, close account, reverse transaction) are one generic modal: buttons `confirm-ok` and `confirm-cancel`. The dialog root has class `confirm-modal`.
- Loading: antd table spinner / `*-loading` ids. Empty: `*-empty`. Query error: `*-error` (+ `*-error-retry`).

## Layout / navigation
| id | element |
|---|---|
| `sidebar`, `main-menu` | left menu |
| `nav-dashboard`, `nav-customers`, `nav-accounts`, `nav-transactions` | menu links |
| `page-content` | content area |

## Dashboard `/`
`dashboard-page`, `dashboard-title`, `dashboard-refresh-btn`, `dashboard-loading`, `dashboard-error`.
Stats (text of the element = value): `stat-customers`, `stat-kyc-pending|verified|rejected`, `stat-accounts`, `stat-accounts-active|frozen|closed`,
`stat-balance-usd|eur|gbp` (formatted money), `stat-volume-usd|eur|gbp` (30-day completed volume), `stat-pending` (count), `stat-pending-amount-usd|eur|gbp`.
Cards: `stat-customers-card`, `stat-accounts-card`, `pending-card`, `stat-balance-card`, `stat-volume-card`.
Shortcut: `pending-approvals-link` (button, navigates to `/transactions?status=PENDING`).

## Customers `/customers`
- Page: `customers-page`, `customers-title`, `new-customer-btn`, `customers-total` (text `Total: N`), `customers-error`.
- Filters: `customers-filter-search` (debounced 300 ms), `customers-filter-kyc` (select), `customers-filter-risk` (select), `customers-filter-country` (2-letter input),
  `customers-filter-has-pending` (checkbox, `hasPendingTransactions=true`), `customers-filter-reset`.
- Table: `customers-table`, `customers-empty`.
- Row `customer-row-<email>`; cells: `customer-link-<email>` (name link to details), `customer-kyc-<email>`, `customer-risk-<email>` (tags, text = enum value), `customer-accounts-<email>` (count).
- Row actions: `customer-view-<email>`, `customer-edit-<email>`, `customer-kyc-verify-<email>` (hidden if VERIFIED), `customer-kyc-reject-<email>` (hidden if REJECTED), `customer-delete-<email>` (then `confirm-ok`).
- Form modal (create: modal id `new-customer-modal`; edit: `edit-customer-modal`; same field ids): `customer-form`, `customer-form-first-name`, `customer-form-last-name`,
  `customer-form-email`, `customer-form-phone`, `customer-form-country`, `customer-form-risk-level` (select LOW/MEDIUM/HIGH), `customer-form-submit`, `customer-form-cancel`.
  Modal closes on success, stays open (with error toast) on server error.

## Customer details `/customers/:id`
`customer-details-page`, `customer-details-title`, `customer-details-loading`, `customer-details-not-found`, `customer-details-error`,
`customer-detail-back`, `customer-detail-edit-btn` (opens `edit-customer-modal`), `open-account-btn` (opens `open-account-modal`),
`customer-profile`, `customer-detail-name|email|phone|country`, `customer-detail-kyc`, `customer-detail-risk`,
quick links `customer-detail-accounts-link` (-> `/accounts?customerId=`), `customer-detail-transactions-link` (-> `/transactions?customerId=`).
Accounts: `customer-accounts-card`, `customer-accounts-table`, rows/actions = account ids below.

## Open account modal (customer details and Accounts page)
`open-account-modal`, `account-form-customer` (select; only present when opened from Accounts page), `account-form-currency` (select USD/EUR/GBP), `account-form-name`,
`account-form-submit`, `account-form-cancel`. Server 422 if the customer's KYC is not VERIFIED (error toast).

## Accounts `/accounts`
- Page: `accounts-page`, `accounts-title`, `new-account-btn`, `accounts-total`, `accounts-error`.
- Filters: `accounts-filter-customer` (searchable select), `accounts-filter-status`, `accounts-filter-currency`, `accounts-filter-reset`.
  URL `?customerId=<id>&status=&currency=` pre-fills filters.
- Table `accounts-table`, `accounts-table-empty` (same ids with `customer-accounts-table` on the details page).
- Row `account-row-<id>`; cells `account-name-<id>`, `account-customer-<id>` (link), `account-currency-<id>`, `account-balance-<id>`, `account-status-<id>` (tag).
- Actions: `account-view-<id>` (opens drawer), `account-freeze-<id>` (ACTIVE only), `account-unfreeze-<id>` (FROZEN only), `account-close-<id>` (not CLOSED; then `confirm-ok`).
- Drawer: `account-drawer`, `account-drawer-name|status|customer|currency|balance`, `account-drawer-loading`, `account-drawer-error`;
  recent transactions (10 newest): `account-drawer-tx-table`, rows `drawer-tx-row-<id>`, `drawer-tx-type-<id>`, `drawer-tx-status-<id>`, `drawer-tx-amount-<id>`, `drawer-tx-from-<id>`, `drawer-tx-to-<id>`. No actions in the drawer.

## Transactions `/transactions`
- Page: `transactions-page`, `transactions-title`, `new-transaction-btn`, `transactions-total`, `transactions-error`.
- Filters: `transactions-filter-status`, `transactions-filter-type`, `transactions-filter-customer` (searchable select), `transactions-filter-account` (searchable select),
  `transactions-filter-risk` (customerRiskLevel), `transactions-filter-min-amount`, `transactions-filter-max-amount`, `transactions-filter-date-from`, `transactions-filter-date-to`
  (native date inputs; sent as start/end of the local day, ISO), `transactions-filter-reset`.
  URL `?status=&type=&accountId=&customerId=&customerRiskLevel=&minAmount=&maxAmount=` pre-fills filters.
- Table `transactions-table`, `transactions-table-empty`.
- Row `tx-row-<id>`; cells `tx-type-<id>`, `tx-status-<id>` (tags), `tx-reason-<id>` (rejection reason, if any), `tx-amount-<id>`, `tx-from-<id>`, `tx-to-<id>` (account name + customer name + risk tag),
  `tx-from-risk-<id>`, `tx-to-risk-<id>`.
- Actions: `tx-approve-<id>` (PENDING), `tx-reject-<id>` (PENDING; opens reject modal), `tx-reverse-<id>` (COMPLETED; then `confirm-ok`).
- Reject modal: `reject-modal`, `reject-reason` (textarea, required), `reject-submit`, `reject-cancel`.
- New transaction modal: `tx-modal`; tabs `tx-tab-deposit`, `tx-tab-withdraw`, `tx-tab-transfer`. Only the active tab's form is rendered.
  - Deposit: `tx-form-deposit-account` (select), `tx-form-deposit-amount`, `tx-form-deposit-description`, `tx-form-deposit-submit`, `tx-form-deposit-cancel`.
  - Withdraw: `tx-form-withdraw-account`, `tx-form-withdraw-amount`, `tx-form-withdraw-description`, `tx-form-withdraw-submit`, `tx-form-withdraw-cancel`.
  - Transfer: `tx-form-transfer-from`, `tx-form-transfer-to`, `tx-form-transfer-amount`, `tx-form-transfer-description`, `tx-form-transfer-submit`, `tx-form-transfer-cancel`.
  - Account selects list the first 100 accounts (all statuses). Transfers >= 10000 are created PENDING (toast says so).
- Not-found route: antd `Result` 404 (`not-found-page`) with a "Back to dashboard" button (`not-found-back`).

## Deliberately absent
No bulk actions, no multi-select checkboxes, no export. One row, one click, one request.
