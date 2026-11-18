# Architecture – step 01: fat controllers

```
React admin ──HTTP──▶ Controller (validation + rules + TypeORM + mapping) ──▶ PostgreSQL
```

`apps/backend/src/{customers,accounts,transactions,reports}/*.controller.ts` contain **everything**:
DTO validation, business rules (KYC gate, four-eyes threshold, frozen accounts, reversals),
transactions and locks, SQL via TypeORM, response mapping. There are no services and no domain layer — on purpose.

## Why MCP is hard to add here

We want an MCP tool `transfer` that does exactly what `POST /api/transactions/transfer` does. Options:

| Option | Problem |
|---|---|
| Copy the controller code into an MCP tool | Two copies of the money rules. Fix a bug in one, forget the other. |
| MCP tool calls our own REST API over HTTP | Extra network hop, HTTP errors re-translated into tool errors, ids/pagination leak, you are now testing through the presentation layer. |
| Inject the controller into the tool and call the method | Controller methods take HTTP DTOs and throw HTTP exceptions; the tool depends on the HTTP layer. |
| Extract services "properly" | That is the refactor of step 02 — done after the fact, across ~25 endpoints, with no tests but the UI. |

Repeated logic you can find in the fat version (grep for it): "account must be ACTIVE" (in 6 places), balance math,
the 10 000 four-eyes threshold, currency checks, and the transfer/reverse movement code.

## Next
`git checkout 02-use-cases`: the same behaviour, one use case per file.
