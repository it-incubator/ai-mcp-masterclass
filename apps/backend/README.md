# Ledger Admin backend (step 01: fat controllers)

NestJS 11 + TypeORM + PostgreSQL. REST under `/api`, Swagger UI at `/api/docs`. No auth, `synchronize: true` - **local demo only**.

## Fat on purpose

This is the "before" picture of the master class. Every controller method contains its own
validation of business rules, error messages, locking and TypeORM access
(`DataSource`, `QueryBuilder`, `dataSource.transaction` with `pessimistic_write` locks, accounts locked in id order).

- There are **no services, no use cases, no shared domain layer**.
- Small checks are duplicated between methods (e.g. "account must be ACTIVE" in deposit, withdraw, transfer, approve, reverse). That is the point.
- Each controller starts with `// NOTE(masterclass): logic lives in the controller on purpose`.
- The business logic is glued to HTTP, so it cannot be reused by a second presentation layer (e.g. MCP) without copy-paste. Steps 02/03 fix that.

## Structure

```
src/
  main.ts                 bootstrap: prefix, CORS, ValidationPipe, Swagger, seed when DB empty
  app.module.ts           TypeORM config (env, DB connect retry) + controllers
  entities/               Customer, Account, Transaction (numeric transformer for money)
  common/                 money helpers (integer cents), pagination DTO
  customers|accounts|transactions/   *.controller.ts (all logic) + *.dto.ts (class-validator)
  reports/ dev/ health/   summary report, POST /dev/reset, GET /health
  seed/seed.ts            deterministic demo data (mulberry32, relative timestamps) - infrastructure
scripts/smoke.sh          curl smoke test (npm run smoke; it calls /dev/reset!)
```

## Run

```bash
docker compose up -d db          # from repo root, Postgres on localhost:5433
npm install && npm run build && npm start      # or: npm run start:dev
npm run smoke
```

Env (defaults for local dev): `DB_HOST=localhost DB_PORT=5433 DB_USER=ledger DB_PASSWORD=ledger DB_NAME=ledger PORT=3000 ENABLE_DEV_RESET=true`.
Stale DB volume from another branch/step: `docker compose down -v`.

## Notes on the contract

- Errors: `{statusCode, message, error}`; 400 validation, 404 not found, 409 conflict/delete blocked, 422 business rule.
- Creating POSTs return 201 (customers, accounts, deposit, withdraw, transfer); action POSTs (kyc, freeze, unfreeze, close, approve, reject, reverse, dev/reset) return 200; `DELETE` returns 204.
- Transaction endpoints return the enriched item (account/customer names and risk levels).
- Four-eyes: TRANSFER >= 10000 is created PENDING; creation validates accounts/funds, approval re-checks them.
