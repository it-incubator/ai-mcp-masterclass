import { test, expect, resetBeforeEach } from '../support/fixtures';
import { api, customerWithAccounts, listTransactions } from '../support/api';
import { selectOption } from '../support/ui';
import { TransactionsPage } from '../pages/TransactionsPage';

resetBeforeEach();

const acct = async (email: string, name: string) => (await customerWithAccounts(email)).accounts.find((a: any) => a.name === name);
const JOHN = 'John USD - John Doe';
const MAIN = 'Main EUR - Maria Garcia';
const SAVINGS = 'Savings EUR - Maria Garcia';
const VIKTOR_USD = 'Viktor USD Main - Viktor Petrov';

/** The single (newest) tx of an account straight from the API, to get its id. */
async function newestTx(accountId: string) {
  return (await listTransactions({ accountId, limit: 1 })).items[0];
}

test('deposit increases the balance and appears as COMPLETED', async ({ page }) => {
  const john = await acct('john.doe@example.com', 'John USD');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${john.id}`);
  await p.deposit(JOHN, 500, 'e2e deposit');
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  await expect(page.locator('[data-testid^="tx-row-"]')).toHaveCount(1);
  const tx = await newestTx(john.id);
  await expect(page.getByTestId(`tx-type-${tx.id}`)).toHaveText('DEPOSIT');
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('COMPLETED');
  await expect(page.getByTestId(`tx-amount-${tx.id}`)).toContainText('$500.00');
  expect((await api(`/accounts/${john.id}`)).balance).toBe(500);
});

test('withdraw decreases the balance', async ({ page }) => {
  const maria = await acct('maria.garcia@example.com', 'Main EUR');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${maria.id}`);
  const before = (await listTransactions({ accountId: maria.id, limit: 100 })).total;
  await p.withdraw(MAIN, 300);
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  await expect(page.getByTestId('transactions-total')).toHaveText(`Total: ${before + 1}`);
  const tx = await newestTx(maria.id);
  await expect(page.getByTestId(`tx-type-${tx.id}`)).toHaveText('WITHDRAWAL');
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('COMPLETED');
  expect((await api(`/accounts/${maria.id}`)).balance).toBe(2200);
});

test('transfer below the limit completes immediately', async ({ page }) => {
  const main = await acct('maria.garcia@example.com', 'Main EUR');
  const savings = await acct('maria.garcia@example.com', 'Savings EUR');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${savings.id}`);
  await p.transfer(MAIN, SAVINGS, 1000);
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  const tx = await newestTx(savings.id);
  await expect(page.getByTestId(`tx-type-${tx.id}`)).toHaveText('TRANSFER');
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('COMPLETED');
  expect((await api(`/accounts/${main.id}`)).balance).toBe(1500);
  expect((await api(`/accounts/${savings.id}`)).balance).toBe(1000);
});

test('withdrawing more than the balance shows an error and creates nothing', async ({ page }) => {
  const john = await acct('john.doe@example.com', 'John USD');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${john.id}`);
  await p.withdraw(JOHN, 100);
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(page.getByTestId('tx-modal')).toBeVisible();
  await page.getByTestId('tx-form-withdraw-cancel').click();
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  await expect(page.getByTestId('transactions-table-empty')).toBeVisible();
  expect((await listTransactions({ accountId: john.id })).total).toBe(0);
  expect((await api(`/accounts/${john.id}`)).balance).toBe(0);
});

test('transfer of 10000 or more is created PENDING; approve executes it', async ({ page }) => {
  const john = await acct('john.doe@example.com', 'John USD');
  const viktor = await acct('viktor.petrov@example.com', 'Viktor USD Main');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${john.id}`);
  await p.transfer(VIKTOR_USD, JOHN, 10000);
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  const tx = await newestTx(john.id);
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('PENDING');
  expect((await api(`/accounts/${john.id}`)).balance).toBe(0);
  const vBefore = (await api(`/accounts/${viktor.id}`)).balance;

  await page.getByTestId(`tx-approve-${tx.id}`).click();
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('COMPLETED');
  await expect(page.getByTestId(`tx-approve-${tx.id}`)).toHaveCount(0);
  expect((await api(`/accounts/${john.id}`)).balance).toBe(10000);
  expect((await api(`/accounts/${viktor.id}`)).balance).toBe(vBefore - 10000);
});

test('reject a pending transfer with a reason', async ({ page }) => {
  const p = new TransactionsPage(page);
  await p.goto('?status=PENDING');
  const pending = (await listTransactions({ status: 'PENDING', limit: 100 })).items;
  const target = pending.find((t) => t.fromCustomerName === 'Mia Costa')!;
  // empty reason is not accepted
  await page.getByTestId(`tx-reject-${target.id}`).click();
  await page.getByTestId('reject-submit').click();
  await expect(page.getByTestId('reject-modal')).toBeVisible();
  await page.getByTestId('reject-cancel').click();
  await expect(page.getByTestId('reject-modal')).toBeHidden();
  await expect(page.getByTestId(`tx-status-${target.id}`)).toHaveText('PENDING');

  await p.reject(target.id, 'Suspicious counterparty');
  await expect(page.getByTestId('reject-modal')).toBeHidden();
  await expect(page.getByTestId(`tx-row-${target.id}`)).toHaveCount(0);
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 11');
  const after = await api(`/transactions/${target.id}`);
  expect(after.status).toBe('REJECTED');
  expect(after.rejectionReason).toBe('Suspicious counterparty');
});

test('reverse a completed deposit', async ({ page }) => {
  const john = await acct('john.doe@example.com', 'John USD');
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${john.id}`);
  await p.deposit(JOHN, 250);
  await expect(page.getByTestId('tx-modal')).toBeHidden();
  const tx = await newestTx(john.id);
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('COMPLETED');
  await page.getByTestId(`tx-reverse-${tx.id}`).click();
  await p.confirm();
  await expect(page.getByTestId(`tx-status-${tx.id}`)).toHaveText('REVERSED');
  await expect(page.getByTestId(`tx-reverse-${tx.id}`)).toHaveCount(0);
  expect((await api(`/accounts/${john.id}`)).balance).toBe(0);
});

test('reverse fails with an error when the funds are gone', async ({ page }) => {
  const john = await acct('john.doe@example.com', 'John USD');
  const dep = await api('/transactions/deposit', { method: 'POST', body: JSON.stringify({ accountId: john.id, amount: 100 }) });
  await api('/transactions/withdraw', { method: 'POST', body: JSON.stringify({ accountId: john.id, amount: 100 }) });
  const p = new TransactionsPage(page);
  await p.goto(`?accountId=${john.id}`);
  await page.getByTestId(`tx-reverse-${dep.id}`).click();
  await p.confirm();
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(page.getByTestId(`tx-status-${dep.id}`)).toHaveText('COMPLETED');
});

test('filters: status, type and amount range', async ({ page }) => {
  const p = new TransactionsPage(page);
  await p.goto();
  await selectOption(page, 'transactions-filter-status', 'PENDING');
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 12');
  await page.getByTestId('transactions-filter-min-amount').fill('30000');
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 3');
  await page.getByTestId('transactions-filter-reset').click();
  await selectOption(page, 'transactions-filter-type', 'DEPOSIT');
  const deposits = (await api('/transactions?type=DEPOSIT&limit=1')).total;
  await expect(page.getByTestId('transactions-total')).toHaveText(`Total: ${deposits}`);
});
