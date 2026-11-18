#!/usr/bin/env bash
# Quick smoke test against a running backend. Usage: npm run smoke  (BASE_URL=http://localhost:3000/api)
# WARNING: calls POST /dev/reset (wipes and reseeds the demo data).
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000/api}"
fail() { echo "FAIL: $*" >&2; exit 1; }
expect() { # expect <description> <expected-http-code> <curl args...>
  local desc="$1" want="$2"; shift 2
  local got; got=$(curl -s -o "$OUT" -w '%{http_code}' "$@")
  [ "$got" = "$want" ] || { cat "$OUT" >&2; fail "$desc: expected $want, got $got"; }
  echo "ok   $desc ($got)"
}
OUT=$(mktemp)
J=(-H 'content-type: application/json')

expect "health" 200 "$BASE/health"
expect "reset" 200 -X POST "$BASE/dev/reset"
expect "summary" 200 "$BASE/reports/summary"
[ "$(curl -s "$BASE/reports/summary" | grep -o '"pendingTransactions":12')" ] || fail "expected 12 pending transactions"
expect "customers list" 200 "$BASE/customers?search=viktor"
expect "customers limit>100" 400 "$BASE/customers?limit=101"
expect "pending-owner customers" 200 "$BASE/customers?hasPendingTransactions=true&riskLevel=HIGH"
expect "accounts list" 200 "$BASE/accounts?status=ACTIVE&limit=100"
expect "pending transactions" 200 "$BASE/transactions?status=PENDING&fromCustomerRiskLevel=HIGH"

PENDING_ID=$(curl -s "$BASE/transactions?status=PENDING&limit=1" | sed -E 's/.*"items":\[\{"id":"([^"]+)".*/\1/')
expect "reject needs reason" 400 -X POST "${J[@]}" "$BASE/transactions/$PENDING_ID/reject" -d '{}'
expect "reject pending" 200 -X POST "${J[@]}" "$BASE/transactions/$PENDING_ID/reject" -d '{"reason":"smoke test"}'
expect "reject again -> 422" 422 -X POST "${J[@]}" "$BASE/transactions/$PENDING_ID/reject" -d '{"reason":"again"}'

expect "create customer" 201 -X POST "${J[@]}" "$BASE/customers" -d '{"firstName":"Smoke","lastName":"Test","email":"smoke.test@example.com","country":"US"}'
expect "duplicate email -> 409" 409 -X POST "${J[@]}" "$BASE/customers" -d '{"firstName":"Smoke","lastName":"Test","email":"smoke.test@example.com","country":"US"}'
echo "SMOKE OK"
