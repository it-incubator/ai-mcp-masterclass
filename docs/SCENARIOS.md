# Demo scenarios: UI vs AI + MCP

Goal: not "AI is always faster", but **"one prompt vs N pages"**. For each scenario count pages visited,
clicks and form fields in the UI, then run the single prompt with the MCP server (branch `03-use-cases-mcp`)
and note wall-clock time and the number of tool calls. Warm-ups are honest: the UI is fine there.

Data comes from the deterministic seed. Restore it any time: `npm run reset-data` (or `POST /api/dev/reset`).

## Warm-ups (the UI is OK here)

### W1. Onboard Anna Smirnova
Prompt: *"Customer Anna Smirnova (anna.smirnova@example.com) is waiting for KYC. Verify her, open an EUR account called Main and deposit 5000."*
UI: Customers → search → verify KYC → customer page → Open account modal (3 fields) → Transactions → New transaction → Deposit tab (account select + amount) ≈ 4 pages, ~15 clicks.
Expected: Anna VERIFIED, 1 ACTIVE EUR account `Main`, balance 5 000.00, one COMPLETED DEPOSIT.

### W2. Savings sweep
Prompt: *"Move the entire balance of Maria Garcia's 'Main EUR' account to her 'Savings EUR' account."*
Expected: Main EUR = 0.00, Savings EUR = 2 500.00, one COMPLETED TRANSFER (2 500 < 10 000 so no approval needed).

## Headline scenarios (the UI hurts here)

### A. Four-eyes queue, bulk conditional decision
There are 12 PENDING transfers ≥ 10 000.
Prompt: *"Go through all pending transfers. Reject (reason: 'High risk customer') every one whose sender is a HIGH-risk customer. Approve those where the sender is LOW risk and the amount is below 20 000. Leave the rest. List what you did."*
UI: Transactions → filter pending → open each row, look up the sender customer risk (Customers page), then approve / reject modal one by one → 12 rows, ≥ 40 clicks, 2 pages ping-pong.
Expected: 5 REJECTED (Viktor Petrov), 4 COMPLETED (LOW risk < 20 000), 3 still PENDING (2 MEDIUM + one LOW at 21 000).

### B. Month-end report
Prompt: *"Month-end: what is the completed transaction volume per currency over the last 30 days, and which ACTIVE accounts have zero balance and no transactions in the last 30 days? Don't change anything."*
UI: Dashboard shows volume, but the second part needs Accounts (filter active) × Transactions (filter dates) cross-checking per account.
Expected: numbers equal `GET /api/reports/summary` `volumeLast30Days`; list of idle accounts.

### C. Suspicious activity
Prompt: *"Viktor Petrov looks suspicious. Show me his last 10 transactions, then freeze all his accounts."*
UI: Customers → Viktor → accounts (3) → freeze each with confirm → Transactions filtered by customer.
Expected: 3 FROZEN accounts; list of 10 latest transactions incl. 8 recent withdrawals.

### D. Cross-entity query + bulk action
Prompt: *"Find customers who are HIGH risk and have pending transactions. List them first, wait for my confirmation, then freeze all their accounts."*
UI: no screen answers this; you join Customers (risk) × Transactions (pending) × Accounts by hand.
Shows the **write-safety beat**: the AI lists first, you confirm, then it acts.

## Measuring sheet

| Scenario | UI pages | UI clicks (est.) | Prompts | Tool calls | Wall-clock |
|---|---|---|---|---|---|
| W1 | 4 | ~15 | 1 | | |
| W2 | 3 | ~10 | 1 | | |
| A | 2 (×12) | 40+ | 1 | | |
| B | 3 | 20+ | 1 | | |
| C | 3 | ~15 | 1 | | |
| D | 3 | 25+ | 1–2 | | |

Honest takeaway: AI latency is 10–30 s; an experienced clicker beats it on W1/W2. It wins where the UI forces joins, loops and bulk work.
