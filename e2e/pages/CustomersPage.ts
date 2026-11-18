import { Page, expect } from '@playwright/test';
import { selectOption, confirmOk } from '../support/ui';

export interface CustomerInput {
  firstName: string; lastName: string; email: string; phone?: string; country: string; risk?: string;
}

export class CustomersPage {
  constructor(readonly page: Page) {}
  async goto() { await this.page.goto('/customers'); await expect(this.page.getByTestId('customers-page')).toBeVisible(); }
  row(email: string) { return this.page.getByTestId(`customer-row-${email}`); }
  async search(text: string) { await this.page.getByTestId('customers-filter-search').fill(text); }
  async fillForm(c: Partial<CustomerInput>) {
    const t = (id: string) => this.page.getByTestId(`customer-form-${id}`);
    if (c.firstName !== undefined) await t('first-name').fill(c.firstName);
    if (c.lastName !== undefined) await t('last-name').fill(c.lastName);
    if (c.email !== undefined) await t('email').fill(c.email);
    if (c.phone !== undefined) await t('phone').fill(c.phone);
    if (c.country !== undefined) await t('country').fill(c.country);
    if (c.risk) await selectOption(this.page, 'customer-form-risk-level', c.risk);
  }
  async create(c: CustomerInput) {
    await this.page.getByTestId('new-customer-btn').click();
    await expect(this.page.getByTestId('new-customer-modal')).toBeVisible();
    await this.fillForm(c);
    await this.page.getByTestId('customer-form-submit').click();
  }
  async confirm() { await confirmOk(this.page); }
}
