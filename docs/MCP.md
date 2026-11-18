# MCP: connect an AI client to Ledger Admin

The backend (branch `03-use-cases-mcp`) exposes the use cases as MCP tools over **Streamable HTTP** at
`http://localhost:3000/mcp` (REST stays under `/api`). No auth: local demo only.

Start the stack first: `docker compose up --build` (or `npm run dev:db` + `npm run dev:backend`), then reset the demo data if you like:
`curl -X POST http://localhost:3000/api/dev/reset`.

## Claude Code

The repo root contains `.mcp.json`:

```json
{ "mcpServers": { "ledger": { "type": "http", "url": "http://localhost:3000/mcp" } } }
```

Open Claude Code in the repo root and approve the project MCP server (or run `claude mcp add --transport http ledger http://localhost:3000/mcp`).
Check with `/mcp`: server `ledger` should be connected with 21 tools.

## Claude Desktop

Claude Desktop talks to local servers through a stdio bridge. In `claude_desktop_config.json` add:

```json
{
  "mcpServers": {
    "ledger": { "command": "npx", "args": ["mcp-remote", "http://localhost:3000/mcp"] }
  }
}
```

Restart Claude Desktop. (`mcp-remote` is fetched by `npx` on first start.)

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

In the UI choose transport "Streamable HTTP", URL `http://localhost:3000/mcp`, Connect, then List Tools.

## Tools (21)

Names are the snake_case of the use cases. List tools default to `limit` 10 (max 100).
Domain errors come back as tool results with `isError: true` and the same message as REST.

| Tool | Use case | What it does / rules the model should know |
|---|---|---|
| `list_customers` | ListCustomers | filters: search, kycStatus, riskLevel, country, hasPendingTransactions, page, limit |
| `get_customer` | GetCustomer | customer + accounts |
| `create_customer` | CreateCustomer | KYC starts PENDING, risk defaults LOW, unique email |
| `update_customer` | UpdateCustomer | partial update |
| `set_kyc_status` | SetKycStatus | VERIFIED or REJECTED |
| `delete_customer` | DeleteCustomer | only if no ACTIVE/FROZEN accounts and no transactions on its accounts |
| `list_accounts` | ListAccounts | filters: customerId, status, currency |
| `get_account` | GetAccount | account + owner summary |
| `open_account` | OpenAccount | owner must be KYC VERIFIED; USD/EUR/GBP |
| `freeze_account` | FreezeAccount | ACTIVE only |
| `unfreeze_account` | UnfreezeAccount | FROZEN only |
| `close_account` | CloseAccount | balance must be 0, no PENDING transactions |
| `list_transactions` | ListTransactions | newest first; filters incl. status, type, accountId, customerId, customerRiskLevel, fromCustomerRiskLevel, amount and date range |
| `get_transaction` | GetTransaction | enriched transaction |
| `deposit` | Deposit | ACTIVE account, amount > 0, 2 decimals |
| `withdraw` | Withdraw | ACTIVE account, sufficient funds |
| `transfer` | Transfer | same currency; **amount >= 10 000 is created PENDING (four-eyes), no money moves** |
| `approve_transaction` | ApproveTransaction | PENDING only; re-checks accounts and funds |
| `reject_transaction` | RejectTransaction | PENDING only; reason required |
| `reverse_transaction` | ReverseTransaction | COMPLETED only; inverse movement, status REVERSED |
| `get_summary_report` | GetSummaryReport | counts, balances, pending queue, 30-day volume |

## Try it

> Show me the PENDING transfers from HIGH-risk customers. Reject all of them with the reason "high risk". List first, then ask me before acting.

## Troubleshooting

- `curl -i http://localhost:3000/mcp` answering `405` is expected (the server is stateless and accepts `POST`).
- Port busy / different port: change the URL in `.mcp.json` and in the client config.
- Library: `@rekog/mcp-nest` 1.9.11 (v1 API, `McpModule.forRoot`) on `@modelcontextprotocol/sdk` 1.32.2 and zod 4.
