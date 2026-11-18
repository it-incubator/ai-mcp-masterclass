# Ledger Admin backend (step 03: use cases + MCP)

NestJS 11 + TypeORM + PostgreSQL. REST under `/api`, Swagger UI at `/api/docs`. No auth, `synchronize: true` - **local demo only**.

## Use cases (CQRS) + MCP

Step 03 of the master class (step 02 plus an MCP presentation layer: `src/presentation/mcp/*.tools.ts`, one tool per use case, Streamable HTTP at `http://localhost:3000/mcp`, see `docs/MCP.md`). The use-case refactoring from step 02: the fat controllers of step 01 are split into **use cases**.
One use case = one folder = one command/query + one handler (`@nestjs/cqrs`).
The REST contract, status codes and error messages are identical to step 01.

- `src/presentation/http` - thin controllers: DTO validation -> `commandBus.execute(new XCommand(...))` / `queryBus.execute(...)` -> return. One exception filter maps domain errors to HTTP.
- `src/application/<context>/{commands,queries}/<use-case>/` - plain Command/Query class + handler. 21 use cases.
- `src/domain` - enums, money (integer cents), domain errors, and the business rules (account state guards, four-eyes threshold, transfer/approve/reverse rules) that were duplicated in step 01.
- `src/infrastructure` - TypeORM entities, seed, `POST /dev/reset`, `GET /health` (not use cases).

See `docs/ARCHITECTURE.md` in the repo root for the layer diagram and the use-case catalogue.

## Structure

```
src/
  main.ts                          bootstrap: prefix, CORS, ValidationPipe, Swagger, seed when DB empty
  app.module.ts                    TypeORM config + CqrsModule + handlers + controllers + exception filter
  domain/                          enums, money, errors/, *.rules.ts (pure functions, no Nest, no TypeORM queries)
  application/<context>/commands|queries/<use-case>/<use-case>.command|query.ts + .handler.ts
  presentation/mcp/                *.tools.ts (21 MCP tools, zod schemas, domain error -> isError result)
  presentation/http/               *.controller.ts (thin), dto/ (class-validator), domain-exception.filter.ts
  infrastructure/                  persistence/entities, seed/, dev/, health/
scripts/smoke.sh                   curl smoke test (npm run smoke; it calls /dev/reset!)
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
