# AI + MCP master class: admin panel vs. "just ask the AI"

A small fintech back-office ("Ledger Admin": customers, accounts, transactions) built to show two things:

1. Doing real work through an admin UI is slow: pages, filters, modals, copy-pasted ids.
2. If the backend has a clean application layer (use cases), adding an **MCP server** as a second presentation layer is cheap. If logic lives in fat controllers, it is not.

> Local demo only: **no authentication**, `synchronize: true`, a dev reset endpoint. Never deploy this.

## Run it (students)

Requirements: Docker Desktop (Compose v2). For local dev and e2e also Node 22+ (`.nvmrc`).

```bash
docker compose up --build
```

| What | URL |
|---|---|
| **Admin panel** | http://localhost:5180 |
| REST API / Swagger | http://localhost:3000/api · http://localhost:3000/api/docs |
| Postgres | localhost:5433 (`ledger` / `ledger` / `ledger`) |

Ports busy? Copy `.env.example` to `.env` and change `BACKEND_PORT`, `FRONTEND_PORT`, `DB_HOST_PORT`.
Data is seeded automatically on first start. Reset it any time: `npm run reset-data`.

**Switching branches:** the DB schema is `synchronize`d, so after switching run `docker compose down -v` before `up --build`.

### Local dev without Docker for the apps
```bash
npm run install:all
npm run dev:db          # postgres only
npm run dev:backend     # http://localhost:3000
npm run dev:frontend    # http://localhost:5180
```

### E2E tests (Playwright)
With the stack running: `npm run e2e` (see `e2e/README.md`).

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
