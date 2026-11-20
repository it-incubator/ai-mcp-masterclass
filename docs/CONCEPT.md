# Master class concept: "Admin panel vs. AI + MCP"

## 1. Story (what we show students)

1. **Act 1 – The pain.** A fintech back-office ("Ledger Admin": customers, accounts, transactions).
   Doing real work in the UI = many pages, filters, modals, forms, copy-pasting ids. We time it.
2. **Act 2 – The wrong way to extend.** The backend is deliberately built with *fat controllers*
   (all logic inside controller methods, DB access via TypeORM right there). We then try to
   "add an MCP layer" and see the problem: the logic is glued to HTTP, so we'd have to copy/paste it
   or call our own REST API over HTTP from MCP.
3. **Act 3 – Refactor.** Each controller action becomes one *use case* = one CQRS command/query + handler,
   one file each (`@nestjs/cqrs`). Controller becomes a thin presentation layer (parse → `commandBus.execute` → map).
4. **Act 4 – MCP for free.** A second presentation layer (`@rekog/mcp-nest`) exposes the *same* use cases as
   MCP tools. Zero business logic duplicated. Connect Claude, run the scenarios from `docs/SCENARIOS.md`
   with a single prompt each.

Local demo only: **no auth anywhere**.

## 2. Repository layout (monorepo, npm workspaces)

```
apps/backend      NestJS 11 + TypeORM + PostgreSQL        (REST under /api)
apps/frontend     React 19 + TS + Vite + TanStack Query + Ant Design + react-router
e2e               Playwright UI tests (+ MCP smoke test on branch 03)
docs/             CONCEPT.md, SCENARIOS.md, ARCHITECTURE.md, MASTERCLASS-SCRIPT.md
docker-compose.yml  Postgres only  (apps run on the host: `npm run setup`, `npm run dev`)
scripts/create-branches.sh   builds the 3 git branches (see §6)
variants/         source snapshots for branches 02 and 03 (see §6)
```

Ports: Postgres host `5433` (container 5432), backend `3000`, frontend `5180`
(Vite dev server). Frontend always talks to `/api` (Vite proxy → backend).

Root npm scripts: `setup`, `dev`, `dev:db`, `dev:backend`, `dev:frontend`, `db:reset`, `e2e`, `reset-data`.

## 3. Domain

Money: `numeric(14,2)` in DB, `number` (2 decimals) in API. Currencies: `USD | EUR | GBP`.

### Entities
- **Customer**: `id uuid, firstName, lastName, email (unique), phone?, country (ISO-2),
  kycStatus PENDING|VERIFIED|REJECTED, riskLevel LOW|MEDIUM|HIGH, createdAt, updatedAt`
- **Account**: `id uuid, customerId (FK), currency, balance, status ACTIVE|FROZEN|CLOSED, name, createdAt, updatedAt`
- **Transaction**: `id uuid, type DEPOSIT|WITHDRAWAL|TRANSFER, status PENDING|COMPLETED|REJECTED|REVERSED,
  amount, currency, fromAccountId?, toAccountId?, description?, rejectionReason?, createdAt, updatedAt`
  - DEPOSIT: `toAccountId` only. WITHDRAWAL: `fromAccountId` only. TRANSFER: both.

### Business rules (the logic that lives in controllers in v1)
- Customer email unique → 409. Customer can be deleted only if it has no accounts → 409.
- Account can be opened only for customers with `kycStatus = VERIFIED` → 422.
- Account can be closed only if `balance = 0` and not already closed → 422. Only ACTIVE can be frozen; only FROZEN unfrozen.
- Deposit/withdraw/transfer require ACTIVE account(s) → 422. Amount > 0, max 2 decimals.
- Withdrawal and transfer need sufficient funds → 422.
- Transfer: currencies of both accounts must equal transaction currency → 422; from ≠ to.
- **Four-eyes rule**: TRANSFER with `amount >= 10000` is created `PENDING` (no money moves).
  `approve` executes it (re-checks active status/funds; if it fails → 422 and stays PENDING).
  `reject` (requires `reason`) → `REJECTED`. Only PENDING can be approved/rejected.
- `reverse`: only COMPLETED; creates inverse money movement, status → `REVERSED`; fails with 422 if the
  receiving account lacks funds / not active.
- All money movements + status change are in one DB transaction.

## 4. REST contract (prefix `/api`) — identical in all branches

Errors: standard Nest JSON `{statusCode, message, error}`; validation 400, not found 404, conflict 409, business rule 422.
Lists: `GET` with `?page=1&limit=20` → `{ items: T[], total: number, page: number, limit: number }`.
Dates are ISO strings. All bodies validated with class-validator DTOs (`whitelist`, `transform`).

### Customers
| Method & path | Notes |
|---|---|
| `GET /customers?search&kycStatus&riskLevel&country&page&limit` | `search` matches name/email (ILIKE). Item includes `accountsCount`. |
| `GET /customers/:id` | customer + `accounts: Account[]` |
| `POST /customers` | `{firstName,lastName,email,phone?,country,riskLevel?}` → kyc PENDING, risk default LOW |
| `PATCH /customers/:id` | partial of firstName,lastName,email,phone,country,riskLevel |
| `POST /customers/:id/kyc` | `{status: VERIFIED|REJECTED}` |
| `DELETE /customers/:id` | 204 |

### Accounts
| `GET /accounts?customerId&status&currency&page&limit` | item includes `customerName` |
| `GET /accounts/:id` | account + `customer` summary |
| `POST /accounts` | `{customerId,currency,name}` balance 0, ACTIVE |
| `POST /accounts/:id/freeze` · `/unfreeze` · `/close` | return updated account |

### Transactions
| `GET /transactions?status&type&accountId&customerId&minAmount&maxAmount&dateFrom&dateTo&page&limit` | newest first; `accountId` matches from OR to; `customerId` matches either side's owner. Item includes `fromAccountName`, `toAccountName`, `fromCustomerName`, `toCustomerName`. |
| `GET /transactions/:id` | |
| `POST /transactions/deposit` | `{accountId, amount, description?}` currency = account currency |
| `POST /transactions/withdraw` | `{accountId, amount, description?}` |
| `POST /transactions/transfer` | `{fromAccountId, toAccountId, amount, description?}` |
| `POST /transactions/:id/approve` | |
| `POST /transactions/:id/reject` | `{reason}` |
| `POST /transactions/:id/reverse` | |

### Reports / dev
| `GET /reports/summary` | `{customersTotal, customersByKyc:{PENDING,VERIFIED,REJECTED}, accountsTotal, accountsByStatus, totalBalanceByCurrency:{USD,EUR,GBP}, pendingTransactions, pendingAmountByCurrency, volumeLast30Days:{USD,EUR,GBP}}` (volume = sum of COMPLETED transaction amounts) |
| `POST /dev/reset` | wipe + reseed deterministic data (used by e2e and by the instructor between demos) → `{ok:true}` |
| `GET /health` | `{status:"ok"}` |

Swagger UI at `/api/docs`.

## 5. Seed data (deterministic, fixed ids not required but names/emails are)

~30 customers, ~50 accounts, ~250 transactions via a seeded PRNG (mulberry32, fixed seed). Plus **hand-crafted fixtures**
used by scenarios and e2e (always present after `reset`):

| Fixture | Details |
|---|---|
| `anna.smirnova@example.com` | Anna Smirnova, PENDING KYC, no accounts (onboarding scenario) |
| `viktor.petrov@example.com` | Viktor Petrov, HIGH risk, VERIFIED, 3 ACTIVE accounts (USD/EUR/GBP) with large balances, **5 PENDING transfers ≥ 10 000** from his accounts, and a burst of 8 withdrawals within the "last 3 days" |
| `maria.garcia@example.com` | Maria Garcia, VERIFIED, LOW risk, 2 accounts: `Main EUR` (balance 2 500.00) and `Savings EUR` (balance 0.00) — transfer scenario |
| `john.doe@example.com` | John Doe, VERIFIED, MEDIUM, 1 USD account with balance 0 and no transactions (deletable after closing) → used by e2e delete/close tests |
| Pending queue | 12 PENDING transfers in total (5 Viktor, 7 across other customers: some LOW/MEDIUM risk, various amounts 10 000–45 000) |

The seed runs automatically on backend start when DB is empty (`synchronize: true` — demo only!).

## 6. Branches (git) and how they are produced

The repo working tree = **step 01** (fat controllers). Because the instructor owns commits, we do **not** commit.
`scripts/create-branches.sh` (run by the instructor once) does `git init` if needed, commits the tree on
`01-fat-controllers`, then creates `02-use-cases` and `03-use-cases-mcp` by overlaying `variants/02-use-cases`
and `variants/03-use-cases-mcp` (full `apps/backend` snapshots + extra files) and committing each. `variants/`
is removed from branches 01–03 (only exists on `main`/the working tree for authoring).

| Branch | Content |
|---|---|
| `01-fat-controllers` | Controllers with all logic, TypeORM directly in controllers. Includes `docs/WHY-MCP-IS-HARD-HERE.md` explaining the options and why each is bad. |
| `02-use-cases` | Same REST contract. `src/application/<context>/{commands,queries}/<name>/<name>.command.ts + .handler.ts`, one use case per folder; controllers thin; domain rules in `src/domain` (entity helper functions/errors). Domain errors mapped to HTTP via an exception filter. |
| `03-use-cases-mcp` | 02 + `src/presentation/mcp/*.tools.ts` using `@rekog/mcp-nest` (Streamable HTTP at `http://localhost:3000/mcp`), each tool calls `commandBus/queryBus` with the same Commands/Queries. `.mcp.json` for Claude Code. Playwright MCP smoke test. |

Use-case catalogue (23 — same names used in `docs/ARCHITECTURE.md`, REST and MCP tool names):
`ListCustomers, GetCustomer, CreateCustomer, UpdateCustomer, SetKycStatus, DeleteCustomer,
ListAccounts, GetAccount, OpenAccount, FreezeAccount, UnfreezeAccount, CloseAccount,
ListTransactions, GetTransaction, Deposit, Withdraw, Transfer, ApproveTransaction, RejectTransaction,
ReverseTransaction, GetSummaryReport` (+ `ResetDemoData` is dev-only and not exposed over MCP) .
MCP tool names are snake_case of these (`list_customers`, `set_kyc_status`, ...).

## 7. Frontend (identical in all branches)

Vite + React + TS strict, Ant Design, `@tanstack/react-query`, react-router. Layout: left menu + content.
Pages:
- **Dashboard** `/` – stat cards (customers, accounts, balances per currency, pending count), "Pending approvals" shortcut.
- **Customers** `/customers` – table with search/KYC/risk/country filters, pagination, row actions (view, edit modal, verify/reject KYC, delete with confirm), "New customer" modal form.
- **Customer details** `/customers/:id` – profile, accounts table, "Open account" modal, quick links.
- **Accounts** `/accounts` – table with filters (customer select, status, currency); actions freeze/unfreeze/close (with confirm); account drawer with its recent transactions.
- **Transactions** `/transactions` – filters (status, type, account, amount range, date range), table, row actions approve / reject (modal with reason) / reverse (confirm); "New transaction" modal with tabs Deposit | Withdraw | Transfer (account selects).
Every interactive element has `data-testid` (kebab-case, e.g. `customers-table`, `customer-row-<email>`, `new-customer-btn`, `customer-form-email`), toasts for success/error showing server message. API client in `src/api`, one hook per endpoint in `src/api/hooks`, invalidating queries after mutations.

## 8. Scenarios (see `docs/SCENARIOS.md`)
1. Onboard Anna Smirnova: verify KYC, open EUR account "Main", deposit 5 000.
2. Four-eyes queue: reject all PENDING transfers from HIGH-risk customers; approve those < 20 000 from LOW-risk. 
3. Suspicious activity: for Viktor Petrov freeze all accounts and list his last 10 transactions.
4. Savings sweep: move entire Main EUR balance of Maria Garcia to Savings EUR.
5. Month-end report: volume per currency for last 30 days + accounts with zero balance for closing.
Each has: UI steps (counted clicks/pages), MCP prompt, expected result.

## 9. E2E (Playwright, `e2e/`)
Runs against the running stack (`npm run dev`), `beforeEach` calls `POST /api/dev/reset`. Specs: dashboard,
customers CRUD + KYC, accounts open/freeze/close, transactions deposit/withdraw/transfer, four-eyes approve/reject/reverse,
scenario 1 and scenario 3 end-to-end through UI. Page-object classes in `e2e/pages`. Single worker (shared DB).

## 10. Remotion video (separate repo `/Users/it-kamasutra/edu-work/remotion-dimych`)
Autumn palette composition (~2–3 min, 1080p) explaining: the problem (UI pain) → fat controllers → separation of
concerns → use cases/CQRS → MCP as second presentation layer → scenario comparison → takeaways.
Rendered mp4 copied to `docs/media/`.

## 11. Risks / decisions
- Library versions drift → pin versions in package.json.
- `synchronize: true` and no auth are explicitly demo-only; say so in README.
- Concurrency: transactions use DB transaction + `pessimistic_write` lock on accounts (ordered by id to avoid deadlock).

---

# 12. Amendments after review (these OVERRIDE anything above that conflicts)

1. **No npm workspaces.** `apps/backend`, `apps/frontend`, `e2e` are independent npm projects, each with its own `package-lock.json`;
   Each app is self-contained in its folder. Root `package.json` only has convenience scripts (`npm --prefix ...`). Node 22 (`.nvmrc`, `engines`).
2. **Transactions list** items additionally include `fromCustomerRiskLevel`, `toCustomerRiskLevel`; filter `customerRiskLevel` (matches either side's owner)
   and `fromCustomerRiskLevel`. **Customers list** gets filter `hasPendingTransactions=true` (owner of an account involved in a PENDING tx).
   Customer list items also include `totalBalanceByCurrency` is NOT required; keep `accountsCount`.
3. **Relative time seed.** All seed timestamps = `now - offset` (PRNG offsets, spread over 90 days). Viktor's 8 withdrawals within last 3 days; ≥ 40 COMPLETED
   transactions in last 30 days. e2e must not assert exact volumes — compare to values read from the API.
4. **Fixed pending queue (12 PENDING transfers, amounts/risk exact):**
   Viktor (HIGH): 12000, 15500, 22000, 30000, 45000 (5). Others: LOW-risk customers: 10000, 11000, 14500, 18000 (4, all < 20 000);
   MEDIUM: 25000, 33000 (2); one more LOW 21000. => Scenario 2 expected: reject 5 (HIGH), approve 4 (LOW and < 20 000), 3 untouched
   (2 MEDIUM + LOW 21000). Pending transfers' source accounts must have enough balance so approval succeeds. Source accounts of the LOW ones are in the same currency as dest.
5. **Reverse (mutate in place, no new row):** only COMPLETED. DEPOSIT: `toAccount` must be ACTIVE and balance ≥ amount, balance -= amount.
   WITHDRAWAL: `fromAccount` ACTIVE, balance += amount. TRANSFER: both ACTIVE, toAccount balance ≥ amount; move back. Status → REVERSED. Else 422. REVERSED/others can't be reversed again.
6. **Close account** also 422 if any PENDING transaction references the account. **Delete customer** allowed iff it has no ACTIVE/FROZEN accounts and none of its accounts
   has any transactions; its CLOSED accounts are deleted with it. Otherwise 409.
7. **Error table:** 400 validation · 404 entity not found (including account/customer referenced in a body) · 409 uniqueness / delete-blocked ·
   422 business rule or invalid state transition (frozen/closed account, insufficient funds, KYC not verified, wrong currency, non-PENDING approve ...).
   Shape always `{statusCode, message, error}`; messages must be the same in all branches (a domain-error filter in branch 02 reproduces the exact messages).
   Put messages in the controller v1 code; in 02+ in domain error classes — same text.
8. **Transfer currency:** both accounts must have equal currency (else 422); transaction.currency = that currency.
9. **Money:** compute in integer cents inside code (`Math.round(x*100)`), TypeORM numeric transformer (string → number, rounded 2dp); API numbers.
10. **Pagination:** default limit 20, **max 100** (clamped → 400 above 100). Frontend selects use `limit=100`.
11. **Runtime files:** `docker-compose.yml` (Postgres only, with healthcheck; apps run on the host, backend retries DB connect), `.nvmrc`.
    Stale DB volume between branches → README says `npm run db:reset`. `POST /api/dev/reset` enabled unless `ENABLE_DEV_RESET=false`; truncates tables then reseeds in one DB transaction.
12. **MCP:** tool inputs are zod schemas; each tool maps args → the same Command/Query class. Default `limit` for list tools = 10 (max 100).
    Tool descriptions written for an LLM. Connect via `.mcp.json` (Claude Code, type http `http://localhost:3000/mcp`) and Claude Desktop via `npx mcp-remote` (documented only).
    Pin `@rekog/mcp-nest`, verify on Nest 11 early (context7).
13. **Branches:** keep snapshot approach but `scripts/create-branches.sh` must: refuse if tree dirty after an existing git repo / branches exist (unless `--force`),
    support `--dry-run`, create tags `step-01-fat-controllers`, `step-02-use-cases`, `step-03-use-cases-mcp`, strip `variants/` and `scripts/` branch-irrelevant parts as needed. The script is
    run by the instructor; the AI never commits. `apps/frontend` and `e2e` are identical on all branches except the extra spec `e2e/tests/mcp.spec.ts` (03 only, skipped if `/mcp` missing).
14. **Scenarios** lead with: (A) four-eyes bulk decision, (B) month-end report, (C) suspicious-activity freeze, plus warm-ups (onboarding, savings sweep) honestly marked as "UI is OK here".
    Add scenario (D): "customers that have pending transfers and are HIGH risk → freeze all their accounts" (uses `hasPendingTransactions`). Include a "write-safety" beat (ask the AI to list first, confirm, then act)
    and measure "one prompt vs N pages", not "MCP is faster".
15. **Docs** reduced: `README.md` (run, versions, ports, branch switching), `docs/SCENARIOS.md`, `docs/ARCHITECTURE.md`, `docs/MASTERCLASS-SCRIPT.md`; the "why MCP is hard here" content goes into the ARCHITECTURE.md of branch 01 (section). 
16. **E2E:** reset per test only for mutating specs; `globalSetup` polls `/api/health`; animations disabled via `reducedMotion` + CSS injected in tests; retries 0 local; trace on-first-retry; assert table state over toasts.
17. Use-case count: 21 REST-exposed (+ dev reset). Not every action needs a perfect polish but all are implemented.
