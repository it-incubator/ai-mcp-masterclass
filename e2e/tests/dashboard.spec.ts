import { test, expect, resetBeforeAll } from '../support/fixtures';
import { api } from '../support/api';

resetBeforeAll();

const money = (n: number, sym: string) => `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('dashboard shows stats matching the API summary', async ({ page }) => {
  const s = await api('/reports/summary');
  await page.goto('/');
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  await expect(page.getByTestId('stat-customers')).toHaveText(String(s.customersTotal));
  await expect(page.getByTestId('stat-kyc-pending')).toHaveText(String(s.customersByKyc.PENDING));
  await expect(page.getByTestId('stat-kyc-verified')).toHaveText(String(s.customersByKyc.VERIFIED));
  await expect(page.getByTestId('stat-accounts')).toHaveText(String(s.accountsTotal));
  await expect(page.getByTestId('stat-accounts-frozen')).toHaveText(String(s.accountsByStatus.FROZEN));
  await expect(page.getByTestId('stat-balance-usd')).toHaveText(money(s.totalBalanceByCurrency.USD, '$'));
  await expect(page.getByTestId('stat-balance-eur')).toHaveText(money(s.totalBalanceByCurrency.EUR, '€'));
  await expect(page.getByTestId('stat-volume-gbp')).toHaveText(money(s.volumeLast30Days.GBP, '£'));
  await expect(page.getByTestId('stat-pending')).toHaveText('12');
});

test('sidebar navigation reaches every page', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-customers').click();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(page.getByTestId('customers-page')).toBeVisible();
  await page.getByTestId('nav-accounts').click();
  await expect(page.getByTestId('accounts-page')).toBeVisible();
  await page.getByTestId('nav-transactions').click();
  await expect(page.getByTestId('transactions-page')).toBeVisible();
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
});

test('pending approvals shortcut opens the pending queue', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('pending-approvals-link').click();
  await expect(page).toHaveURL(/\/transactions\?status=PENDING/);
  await expect(page.getByTestId('transactions-total')).toHaveText('Total: 12');
  const statuses = page.locator('[data-testid^="tx-status-"]');
  await expect(statuses).toHaveCount(12);
  for (const t of await statuses.allTextContents()) expect(t).toBe('PENDING');
});

test('unknown route shows the 404 page with a way back', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByTestId('not-found-page')).toBeVisible();
  await page.getByTestId('not-found-back').click();
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
});
