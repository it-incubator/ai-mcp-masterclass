import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';

const MCP_URL = process.env.MCP_URL ?? 'http://localhost:3000/mcp';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';

const EXPECTED_TOOLS = [
  'list_customers', 'get_customer', 'create_customer', 'update_customer', 'set_kyc_status', 'delete_customer',
  'list_accounts', 'get_account', 'open_account', 'freeze_account', 'unfreeze_account', 'close_account',
  'list_transactions', 'get_transaction', 'deposit', 'withdraw', 'transfer',
  'approve_transaction', 'reject_transaction', 'reverse_transaction', 'get_summary_report',
];

async function mcpReachable(): Promise<boolean> {
  try {
    // a stateless Streamable HTTP server answers 405 to GET; any HTTP answer except 404 means the endpoint exists
    const res = await fetch(MCP_URL, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.status !== 404;
  } catch {
    return false;
  }
}

test.describe('MCP server (branch 03)', () => {
  test.describe.configure({ mode: 'serial' });
  let client: Client;

  test.beforeAll(async () => {
    test.skip(!(await mcpReachable()), `${MCP_URL} is not reachable (MCP exists only on branch 03)`);
    const reset = await fetch(`${API_URL}/dev/reset`, { method: 'POST' });
    expect(reset.status).toBe(200);
    client = new Client({ name: 'playwright-mcp-test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  });

  test.afterAll(async () => {
    await client?.close();
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as {
      isError?: boolean;
      content: { type: string; text: string }[];
    };
    return { isError: !!res.isError, text: res.content[0].text };
  };

  test('lists the 21 tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  test('list_customers returns at most the default page of 10', async () => {
    const res = await call('list_customers');
    expect(res.isError).toBe(false);
    const body = JSON.parse(res.text);
    expect(body.items.length).toBeLessThanOrEqual(10);
    expect(body.limit).toBe(10);
    expect(body.total).toBeGreaterThanOrEqual(30);
  });

  test('domain errors come back as isError results with the REST message', async () => {
    const res = await call('get_customer', { id: '11111111-1111-4111-8111-111111111111' });
    expect(res.isError).toBe(true);
    expect(res.text).toBe('Customer with id 11111111-1111-4111-8111-111111111111 not found');
  });

  test('four-eyes flow: reject a pending transfer, then it cannot be decided again', async () => {
    const list = await call('list_transactions', { status: 'PENDING', fromCustomerRiskLevel: 'HIGH', limit: 5 });
    const pending = JSON.parse(list.text).items;
    expect(pending.length).toBeGreaterThan(0);
    const id: string = pending[0].id;

    const rejected = await call('reject_transaction', { id, reason: 'e2e: high risk customer' });
    expect(rejected.isError).toBe(false);
    expect(JSON.parse(rejected.text)).toMatchObject({ id, status: 'REJECTED', rejectionReason: 'e2e: high risk customer' });

    const again = await call('approve_transaction', { id });
    expect(again.isError).toBe(true);
    expect(again.text).toBe('Only PENDING transactions can be approved (current status: REJECTED)');

    const summary = JSON.parse((await call('get_summary_report')).text);
    expect(summary.pendingTransactions).toBe(11);
  });
});
