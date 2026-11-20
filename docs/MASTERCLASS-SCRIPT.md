# Instructor script (~60–75 min)

Before: `npm run setup` then `npm run dev`, open http://localhost:5180, `npm run reset-data`, play `docs/media/masterclass-explainer.mp4` as warm-up if desired.

1. **Pain (10 min)** – on `01-fat-controllers` do scenario A from `docs/SCENARIOS.md` by hand in the UI (reject the HIGH-risk pending transfers, approve the small LOW ones). Count pages and clicks aloud. Reset data.
2. **Look under the hood (10 min)** – open `transactions.controller.ts`. Point out validation + rules + SQL in one method, repeated checks. Read "Why MCP is hard here" in `docs/ARCHITECTURE.md`.
3. **Refactor (15 min)** – `git checkout 02-use-cases` (+ `npm run db:reset`, then restart `npm run dev`). Show the folder `src/application/transactions/commands/transfer/`, the thin controller, domain rules. Run `npm run e2e` — same UI tests are green: behaviour unchanged.
4. **MCP (15 min)** – `git checkout 03-use-cases-mcp`. Show one `*.tools.ts` next to its controller: both call `commandBus.execute(...)`. Connect Claude Code (`.mcp.json`, see `docs/MCP.md`).
5. **Payoff (15 min)** – run scenarios A, C, D with one prompt each. Do the write-safety beat in D (list → confirm → act). Fill the measuring table in `docs/SCENARIOS.md`.
6. **Honest wrap-up (5 min)** – warm-ups W1/W2: UI is fine. AI wins on joins, loops and bulk work; architecture decides how cheaply you get that.

Between runs: `npm run reset-data`.
