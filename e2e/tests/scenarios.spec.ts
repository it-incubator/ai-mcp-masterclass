import { test, expect, resetBeforeEach } from '../support/fixtures';
import { api, customerByEmail, listTransactions } from '../support/api';
import { CustomersPage } from '../pages/CustomersPage';
import { TransactionsPage } from '../pages/TransactionsPage';
import { selectOption } from '../support/ui';

resetBeforeEach();

test('W1 onboarding Anna: verify KYC, open EUR account Main, deposit 5000', async ({ page }) => {
  const email = 'anna.smirnova@example.com';
  const customers = new CustomersPage(page);
  await customers.goto();
  await customers.search('Anna');
  await expect(page.getByTestId(`customer-kyc-${email}`)).toHaveText('PENDING');
  await page.getByTestId(`customer-kyc-verify-${email}`).click();
  await expect(page.getByTestId(`customer-kyc-${email}`)).toHaveText('VERIFIED');

  await page.getByTestId(`customer-link-${email}`).click();
  await expect(page.getByTestId('customer-details-page')).toBeVisible();
  await expect(page.getByTestId('customer-detail-kyc')).toHaveText('VERIFIED');
  await page.getByTestId('open-account-btn').click();
  await selectOption(page, 'account-form-currency', 'EUR');
  await page.getByTestId('account-form-name').fill('Main');
  await page.getByTestId('account-form-submit').click();
  await expect(page.getByTestId('open-account-modal')).toBeHidden();
  const accRow = page.locator('[data-testid^="account-row-"]').filter({ hasText: 'Main' });
  await expect(accRow).toHaveCount(1);
  await expect(accRow).toContainText('ACTIVE');

  await page.getByTestId('nav-transactions').click();
  const txs = new TransactionsPage(page);
  await expect(page.getByTestId('transactions-page')).toBeVisible();
  await txs.deposit('Main - Anna Smirnova', 5000);
  await expect(page.getByTestId('tx-modal')).toBeHidden();

  // verify the end state through the UI: customer page shows 5 000.00, and the API agrees
  const anna = await customerByEmail(email);
  const detail = await api(`/customers/${anna.id}`);
  expect(detail.kycStatus).toBe('VERIFIED');
  expect(detail.accounts).toHaveLength(1);
  const [acc] = detail.accounts;
  expect(acc).toMatchObject({ name: 'Main', currency: 'EUR', status: 'ACTIVE', balance: 5000 });
  const list = await listTransactions({ accountId: acc.id });
  expect(list.items).toHaveLength(1);
  expect(list.items[0]).toMatchObject({ type: 'DEPOSIT', status: 'COMPLETED', amount: 5000 });
  await page.goto(`/customers/${anna.id}`);
  await expect(page.getByTestId(`account-balance-${acc.id}`)).toHaveText('€5,000.00');
});

test('C suspicious activity: freeze all of Viktor\'s accounts through the UI', async ({ page }) => {
  const email = 'viktor.petrov@example.com';
  const customers = new CustomersPage(page);
  await customers.goto();
  await customers.search('viktor');
  await page.getByTestId(`customer-link-${email}`).click();
  await expect(page.getByTestId('customer-details-page')).toBeVisible();
  const rows = page.locator('[data-testid^="account-row-"]');
  await expect(rows).toHaveCount(3);

  // freeze each account; the freeze button disappears from the row so the loop ends at 0
  const ids = (await rows.evaluateAll((l) => l.map((e) => e.getAttribute('data-testid')!.replace('account-row-', ''))));
  for (const id of ids) {
    await page.getByTestId(`account-freeze-${id}`).click();
    await expect(page.getByTestId(`account-status-${id}`)).toHaveText('FROZEN');
  }
  await expect(page.locator('[data-testid^="account-freeze-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="account-unfreeze-"]')).toHaveCount(3);

  const viktor = await api(`/customers/${(await customerByEmail(email)).id}`);
  expect(viktor.accounts.map((a: any) => a.status)).toEqual(['FROZEN', 'FROZEN', 'FROZEN']);

  // his recent activity is one click away
  await page.getByTestId('customer-detail-transactions-link').click();
  await expect(page).toHaveURL(/\/transactions\?customerId=/);
  await expect(page.getByTestId('transactions-table')).toBeVisible();
  const expected = (await listTransactions({ customerId: viktor.id, limit: 100 })).total;
  await expect(page.getByTestId('transactions-total')).toHaveText(`Total: ${expected}`);
  expect(expected).toBeGreaterThanOrEqual(13); // 5 pending + 8 recent withdrawals at minimum
});

test('A four-eyes: reject every pending transfer of HIGH-risk senders via the UI loop', async ({ page }) => {
  const txs = new TransactionsPage(page);
  await txs.goto('?status=PENDING');
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 12');
  await selectOption(page, 'transactions-filter-risk', 'HIGH');
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 5');

  for (let left = 5; left > 0; left--) {
    const row = page.locator('[data-testid^="tx-row-"]').first();
    // sender must be HIGH risk (read from the row, as an operator would)
    await expect(row.locator('[data-testid^="tx-from-risk-"]')).toHaveText('HIGH');
    const id = (await row.getAttribute('data-testid'))!.replace('tx-row-', '');
    await txs.reject(id, 'High risk customer');
    await expect(page.getByTestId('reject-modal')).toBeHidden();
    await expect(page.getByTestId(`tx-row-${id}`)).toHaveCount(0);
    if (left > 1) await expect(page.getByTestId('transactions-total')).toHaveText(`Total: ${left - 1}`);
  }
  await expect(page.getByTestId('transactions-table-empty')).toBeVisible();

  const rejected = await listTransactions({ status: 'REJECTED', limit: 100 });
  const mine = rejected.items.filter((t) => t.rejectionReason === 'High risk customer');
  expect(mine).toHaveLength(5);
  for (const t of mine) expect(t.fromCustomerName).toBe('Viktor Petrov');
  expect((await listTransactions({ status: 'PENDING', limit: 100 })).total).toBe(7);
});
