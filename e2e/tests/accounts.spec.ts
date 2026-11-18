import { test, expect, resetBeforeEach } from '../support/fixtures';
import { api, customerByEmail, customerWithAccounts } from '../support/api';
import { AccountsPage } from '../pages/AccountsPage';
import { selectOption } from '../support/ui';

resetBeforeEach();

const acct = async (email: string, name: string) => (await customerWithAccounts(email)).accounts.find((a: any) => a.name === name);

test('open an account from the customer page', async ({ page }) => {
  const maria = await customerByEmail('maria.garcia@example.com');
  await page.goto(`/customers/${maria.id}`);
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(2);
  await page.getByTestId('open-account-btn').click();
  await expect(page.getByTestId('open-account-modal')).toBeVisible();
  await selectOption(page, 'account-form-currency', 'GBP');
  await page.getByTestId('account-form-name').fill('Travel GBP');
  await page.getByTestId('account-form-submit').click();
  await expect(page.getByTestId('open-account-modal')).toBeHidden();
  const row = page.locator('[data-testid^="account-row-"]').filter({ hasText: 'Travel GBP' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('£0.00');
  await expect(row).toContainText('ACTIVE');
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(3);
});

test('opening an account for a customer without verified KYC is rejected', async ({ page }) => {
  const anna = await customerByEmail('anna.smirnova@example.com');
  await page.goto(`/customers/${anna.id}`);
  await page.getByTestId('open-account-btn').click();
  await selectOption(page, 'account-form-currency', 'EUR');
  await page.getByTestId('account-form-name').fill('Main');
  await page.getByTestId('account-form-submit').click();
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(page.getByTestId('open-account-modal')).toBeVisible();
  await page.getByTestId('account-form-cancel').click();
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(0);
  expect((await api(`/customers/${anna.id}`)).accounts).toHaveLength(0);
});

test('open an account from the Accounts page using the customer select', async ({ page }) => {
  const p = new AccountsPage(page);
  await p.goto();
  await page.getByTestId('new-account-btn').click();
  await selectOption(page, 'account-form-customer', /Maria Garcia/, 'maria');
  await selectOption(page, 'account-form-currency', 'USD');
  await page.getByTestId('account-form-name').fill('Dollar stash');
  await page.getByTestId('account-form-submit').click();
  await expect(page.getByTestId('open-account-modal')).toBeHidden();
  const maria = await customerWithAccounts('maria.garcia@example.com');
  const created = maria.accounts.find((a: any) => a.name === 'Dollar stash');
  expect(created.currency).toBe('USD');
  await selectOption(page, 'accounts-filter-customer', /Maria Garcia/, 'maria');
  await expect(page.getByTestId(`account-row-${created.id}`)).toBeVisible();
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(3);
});

test('filters by status and currency', async ({ page }) => {
  const p = new AccountsPage(page);
  await p.goto();
  await selectOption(page, 'accounts-filter-currency', 'GBP');
  const gbp = (await api('/accounts?currency=GBP&limit=100')).total;
  await expect(page.getByTestId('accounts-total')).toHaveText(`Total: ${gbp}`);
  for (const t of await page.locator('[data-testid^="account-currency-"]').allTextContents()) expect(t).toBe('GBP');
  await page.getByTestId('accounts-filter-reset').click();
  await selectOption(page, 'accounts-filter-status', 'FROZEN');
  const frozen = (await api('/accounts?status=FROZEN&limit=100')).total;
  await expect(page.getByTestId('accounts-total')).toHaveText(`Total: ${frozen}`);
});

test('freeze and unfreeze an account', async ({ page }) => {
  const a = await acct('maria.garcia@example.com', 'Main EUR');
  const p = new AccountsPage(page);
  await p.goto(`?customerId=${a.customerId}`);
  await page.getByTestId(`account-freeze-${a.id}`).click();
  await expect(page.getByTestId(`account-status-${a.id}`)).toHaveText('FROZEN');
  await expect(page.getByTestId(`account-freeze-${a.id}`)).toHaveCount(0);
  expect((await api(`/accounts/${a.id}`)).status).toBe('FROZEN');
  await page.getByTestId(`account-unfreeze-${a.id}`).click();
  await expect(page.getByTestId(`account-status-${a.id}`)).toHaveText('ACTIVE');
});

test('close an empty account with confirmation', async ({ page }) => {
  const a = await acct('john.doe@example.com', 'John USD');
  const p = new AccountsPage(page);
  await p.goto(`?customerId=${a.customerId}`);
  await page.getByTestId(`account-close-${a.id}`).click();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId(`account-status-${a.id}`)).toHaveText('ACTIVE');
  await page.getByTestId(`account-close-${a.id}`).click();
  await p.confirm();
  await expect(page.getByTestId(`account-status-${a.id}`)).toHaveText('CLOSED');
  await expect(page.getByTestId(`account-close-${a.id}`)).toHaveCount(0);
});

test('closing an account with a balance is blocked', async ({ page }) => {
  const a = await acct('maria.garcia@example.com', 'Main EUR');
  const p = new AccountsPage(page);
  await p.goto(`?customerId=${a.customerId}`);
  await page.getByTestId(`account-close-${a.id}`).click();
  await p.confirm();
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(page.getByTestId(`account-status-${a.id}`)).toHaveText('ACTIVE');
  expect((await api(`/accounts/${a.id}`)).status).toBe('ACTIVE');
});

test('account drawer shows details and recent transactions', async ({ page }) => {
  const a = await acct('viktor.petrov@example.com', 'Viktor USD Main');
  const p = new AccountsPage(page);
  await p.goto(`?customerId=${a.customerId}`);
  await page.getByTestId(`account-view-${a.id}`).click();
  await expect(page.getByTestId('account-drawer')).toBeVisible();
  await expect(page.getByTestId('account-drawer-name')).toHaveText('Viktor USD Main');
  await expect(page.getByTestId('account-drawer-currency')).toHaveText('USD');
  await expect(page.getByTestId('account-drawer-status')).toHaveText('ACTIVE');
  await expect(page.getByTestId('account-drawer-tx-table')).toBeVisible();
  expect(await page.locator('[data-testid^="drawer-tx-row-"]').count()).toBeGreaterThan(0);
});
