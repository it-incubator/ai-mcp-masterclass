import { test, expect, resetBeforeEach } from '../support/fixtures';
import { api, customerByEmail } from '../support/api';
import { CustomersPage } from '../pages/CustomersPage';
import { selectOption } from '../support/ui';

resetBeforeEach();

const NEW = { firstName: 'Olga', lastName: 'Ivanova', email: 'olga.ivanova@example.com', phone: '+4915112345678', country: 'DE', risk: 'MEDIUM' };

test('create a customer via modal', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.create(NEW);
  await expect(page.getByTestId('new-customer-modal')).toBeHidden();
  await p.search(NEW.email);
  const row = p.row(NEW.email);
  await expect(row).toBeVisible();
  await expect(page.getByTestId(`customer-kyc-${NEW.email}`)).toHaveText('PENDING');
  await expect(page.getByTestId(`customer-risk-${NEW.email}`)).toHaveText('MEDIUM');
  await expect(page.getByTestId(`customer-accounts-${NEW.email}`)).toHaveText('0');
  const c = await customerByEmail(NEW.email);
  expect(c.country).toBe('DE');
});

test('duplicate email keeps the modal open and shows an error', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.create({ ...NEW, email: 'anna.smirnova@example.com' });
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(page.getByTestId('new-customer-modal')).toBeVisible();
});

test('search and filters narrow the table', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.search('viktor');
  await expect(p.row('viktor.petrov@example.com')).toBeVisible();
  await expect(page.getByTestId('customers-total')).toHaveText('Total: 1');
  await page.getByTestId('customers-filter-reset').click();
  await expect(page.getByTestId('customers-filter-search')).toHaveValue('');

  await selectOption(page, 'customers-filter-risk', 'HIGH');
  const highTotal = (await api('/customers?riskLevel=HIGH&limit=100')).total;
  await expect(page.getByTestId('customers-total')).toHaveText(`Total: ${highTotal}`);
  for (const t of await page.locator('[data-testid^="customer-risk-"]').allTextContents()) expect(t).toBe('HIGH');
  await expect(p.row('viktor.petrov@example.com')).toBeVisible();

  await page.getByTestId('customers-filter-reset').click();
  await selectOption(page, 'customers-filter-kyc', 'PENDING');
  await expect(p.row('anna.smirnova@example.com')).toBeVisible();
  for (const t of await page.locator('[data-testid^="customer-kyc-"]:not([data-testid^="customer-kyc-verify-"]):not([data-testid^="customer-kyc-reject-"])').allTextContents()) expect(t).toBe('PENDING');

  await page.getByTestId('customers-filter-reset').click();
  await page.getByTestId('customers-filter-has-pending').check();
  const pendingTotal = (await api('/customers?hasPendingTransactions=true&limit=100')).total;
  await expect(page.getByTestId('customers-total')).toHaveText(`Total: ${pendingTotal}`);
  await expect(p.row('viktor.petrov@example.com')).toBeVisible();
});

test('edit a customer', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.search('maria.garcia');
  await page.getByTestId('customer-edit-maria.garcia@example.com').click();
  await expect(page.getByTestId('edit-customer-modal')).toBeVisible();
  await expect(page.getByTestId('customer-form-first-name')).toHaveValue('Maria');
  await p.fillForm({ phone: '+34600111222', risk: 'HIGH' });
  await page.getByTestId('customer-form-submit').click();
  await expect(page.getByTestId('edit-customer-modal')).toBeHidden();
  await expect(page.getByTestId('customer-risk-maria.garcia@example.com')).toHaveText('HIGH');
  expect((await customerByEmail('maria.garcia@example.com')).phone).toBe('+34600111222');
});

test('KYC verify and reject', async ({ page }) => {
  const p = new CustomersPage(page);
  const email = 'anna.smirnova@example.com';
  await p.goto();
  await p.search(email);
  await page.getByTestId(`customer-kyc-verify-${email}`).click();
  await expect(page.getByTestId(`customer-kyc-${email}`)).toHaveText('VERIFIED');
  await expect(page.getByTestId(`customer-kyc-verify-${email}`)).toHaveCount(0);
  await page.getByTestId(`customer-kyc-reject-${email}`).click();
  await expect(page.getByTestId(`customer-kyc-${email}`)).toHaveText('REJECTED');
  await expect(page.getByTestId(`customer-kyc-reject-${email}`)).toHaveCount(0);
  expect((await customerByEmail(email)).kycStatus).toBe('REJECTED');
});

test('delete rules: blocked with accounts, allowed after closing', async ({ page }) => {
  const p = new CustomersPage(page);
  // Maria has active accounts -> 409
  await p.goto();
  await p.search('maria.garcia');
  await page.getByTestId('customer-delete-maria.garcia@example.com').click();
  await p.confirm();
  await expect(page.getByTestId('toast-error').first()).toBeVisible();
  await expect(p.row('maria.garcia@example.com')).toBeVisible();

  // John: close his empty account via API, then delete through the UI
  const john = await api('/customers/' + (await customerByEmail('john.doe@example.com')).id);
  for (const a of john.accounts) await api(`/accounts/${a.id}/close`, { method: 'POST' });
  await p.goto();
  await p.search('john.doe');
  await page.getByTestId('customer-delete-john.doe@example.com').click();
  await p.confirm();
  await expect(p.row('john.doe@example.com')).toHaveCount(0);
  await expect(page.getByTestId('customers-empty')).toBeVisible();
});

test('customer without accounts can be deleted', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.search('anna.smirnova');
  await page.getByTestId('customer-delete-anna.smirnova@example.com').click();
  await p.confirm();
  await expect(p.row('anna.smirnova@example.com')).toHaveCount(0);
});

test('customer details page: profile, edit and navigation links', async ({ page }) => {
  const p = new CustomersPage(page);
  await p.goto();
  await p.search('maria.garcia');
  await page.getByTestId('customer-link-maria.garcia@example.com').click();
  await expect(page.getByTestId('customer-details-page')).toBeVisible();
  await expect(page.getByTestId('customer-detail-email')).toHaveText('maria.garcia@example.com');
  await expect(page.getByTestId('customer-detail-kyc')).toHaveText('VERIFIED');
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(2);
  await page.getByTestId('customer-detail-edit-btn').click();
  await expect(page.getByTestId('edit-customer-modal')).toBeVisible();
  await page.getByTestId('customer-form-cancel').click();
  await expect(page.getByTestId('edit-customer-modal')).toBeHidden();
  await page.getByTestId('customer-detail-accounts-link').click();
  await expect(page).toHaveURL(/\/accounts\?customerId=/);
  await expect(page.locator('[data-testid^="account-row-"]')).toHaveCount(2);
});
