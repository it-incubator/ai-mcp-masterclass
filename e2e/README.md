# E2E tests (Playwright)

UI tests for Ledger Admin. They drive the real frontend in Chromium against the running stack and use the REST API only for
setup/verification (`POST /api/dev/reset`, reading ids and balances).

## Prerequisites

- The stack is up: `docker compose up --build -d` from the repo root (frontend http://localhost:5180, backend http://localhost:3000/api).
- Node 22+.
- One-time, local only: `npm --prefix e2e install && npx --prefix e2e playwright install chromium`.

## Run

```bash
npm run e2e                 # from the repo root
npm test                    # from e2e/
npx playwright test customers          # one spec
npx playwright test --headed --debug   # watch it
```

Env: `E2E_BASE_URL` (default `http://localhost:5180`), `E2E_API_URL` (default `http://localhost:3000/api`).
`globalSetup` polls `/api/health` for up to 60 s and fails with a hint if the stack is down.

## Layout

- `tests/` specs: dashboard, customers, accounts, transactions, scenarios (W1 onboarding, C suspicious activity, A four-eyes).
- `pages/` light page objects (Customers, Accounts, Transactions).
- `support/` `api.ts` (fetch client, `resetData`), `ui.ts` (antd Select helper, animation-off CSS), `fixtures.ts` (test with animations off, console-error guard, reset helpers).

## Conventions

- Single worker, shared DB. Mutating specs call `POST /api/dev/reset` in `beforeEach`, read-only specs in `beforeAll`. Never run these tests against data you care about.
- Selectors are `data-testid` (see `apps/frontend/TESTIDS.md`) and seed emails. Assertions target table state; toasts are only used for error paths.
- No absolute timestamps or exact volumes: totals are compared with values read from the API.
- Animations: `reducedMotion: 'reduce'` plus injected CSS. The CSS keeps `animation-duration` at 0.001s (not 0) and uses `transition: none`:
  `0s` animations never emit `animationend` so antd modals stay stuck in their leave state, and a non-zero transition duration breaks popup positioning.
- antd Selects are virtualised: type the option text (`selectOption(page, id, text, search)`) so the option is rendered before clicking.
- Retries 0, trace `on-first-retry`.
- `tests/mcp.spec.ts` lives only on the MCP branch.
