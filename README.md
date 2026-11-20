# AI + MCP master class: admin panel vs. "just ask the AI"

A small fintech back-office ("Ledger Admin": customers, accounts, transactions) built to show two things:

1. Doing real work through an admin UI is slow: pages, filters, modals, copy-pasted ids.
2. If the backend has a clean application layer (use cases), adding an **MCP server** as a second presentation layer is cheap. If logic lives in fat controllers, it is not.

> Local demo only: **no authentication**, `synchronize: true`, a dev reset endpoint. Never deploy this.

## Run it (students)

Requirements: Node 20.19+ or 22.12+ (`.nvmrc` pins 22) and Docker Desktop (used only for Postgres).

```bash
npm run setup   # once: install dependencies + start Postgres in Docker
npm run dev     # backend + frontend with hot reload
```

| What | URL |
|---|---|
| **Admin panel** | http://localhost:5180 |
| REST API / Swagger | http://localhost:3000/api · http://localhost:3000/api/docs |
| Postgres | localhost:5433 (`ledger` / `ledger` / `ledger`) |

Data is seeded automatically on first start. Reset it any time: `npm run reset-data`.
Next day / after reboot: just `npm run dev` (it starts Postgres if needed).

**Switching branches:** the DB schema is `synchronize`d, so after switching run `npm run db:reset` (wipes the database volume) before `npm run dev`.

### Troubleshooting
- `Cannot continue: Node ... is not supported` – install Node 20.19+ or 22.12+ (`nvm install 22`).
- `Docker is not available` – start Docker Desktop, wait until it is running, retry.
- `Port 3000/5180 is already in use` – another copy of `npm run dev` (or another app) is running; stop it.
- `port is already allocated` for 5433 – another Postgres uses that port; stop it.
- Empty/odd data after switching branches – `npm run db:reset`.
- An `EBADENGINE` warning for `react-router` on Node 20 is harmless.

### E2E tests (Playwright)
With `npm run dev` running: `npm run e2e` (see `e2e/README.md`).

## Branches

| Branch | What it shows |
|---|---|
| `01-fat-controllers` | All logic inside controllers. See "Why MCP is hard here" in `docs/ARCHITECTURE.md`. |
| `02-use-cases` | Every controller action → one CQRS command/query + handler, one file each. Controllers are thin. |
| `03-use-cases-mcp` | Same use cases exposed as 21 MCP tools at `http://localhost:3000/mcp`. See `docs/MCP.md`. |

Frontend, REST contract and e2e tests are identical on all branches.

## Docs
- `docs/SCENARIOS.md` – demo scenarios, UI vs. one prompt
- `docs/ARCHITECTURE.md` – layers, use cases (differs per branch)
- `docs/MASTERCLASS-SCRIPT.md` – instructor's running order
- `docs/CONCEPT.md` – design notes and domain rules
- `docs/media/masterclass-explainer.mp4` – 3 min explainer video
