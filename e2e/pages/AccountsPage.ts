import { Page, expect } from '@playwright/test';
import { confirmOk } from '../support/ui';

export class AccountsPage {
  constructor(readonly page: Page) {}
  async goto(qs = '') { await this.page.goto('/accounts' + qs); await expect(this.page.getByTestId('accounts-page')).toBeVisible(); }
  async accountRowByName(name: string, customerLike?: string) {
    let row = this.page.locator('[data-testid^="account-row-"]').filter({ hasText: name });
    if (customerLike) row = row.filter({ hasText: customerLike });
    return row.first();
  }
  async confirm() { await confirmOk(this.page); }
}
