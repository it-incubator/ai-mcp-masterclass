import { Page, expect } from '@playwright/test';
import { selectOption, confirmOk } from '../support/ui';

/** Selects are virtualised, so type the option text to filter it into the DOM. */
const searchOf = (o: string | RegExp) => (typeof o === 'string' ? o : o.source);

export class TransactionsPage {
  constructor(readonly page: Page) {}
  async goto(qs = '') { await this.page.goto('/transactions' + qs); await expect(this.page.getByTestId('transactions-page')).toBeVisible(); }
  row(id: string) { return this.page.getByTestId(`tx-row-${id}`); }
  async openNew(tab: 'deposit' | 'withdraw' | 'transfer') {
    await this.page.getByTestId('new-transaction-btn').click();
    await expect(this.page.getByTestId('tx-modal')).toBeVisible();
    if (tab !== 'deposit') await this.page.getByTestId(`tx-tab-${tab}`).click();
  }
  async deposit(account: string | RegExp, amount: number | string, description?: string) {
    await this.openNew('deposit');
    await selectOption(this.page, 'tx-form-deposit-account', account, searchOf(account));
    await this.page.getByTestId('tx-form-deposit-amount').fill(String(amount));
    if (description) await this.page.getByTestId('tx-form-deposit-description').fill(description);
    await this.page.getByTestId('tx-form-deposit-submit').click();
  }
  async withdraw(account: string | RegExp, amount: number | string) {
    await this.openNew('withdraw');
    await selectOption(this.page, 'tx-form-withdraw-account', account, searchOf(account));
    await this.page.getByTestId('tx-form-withdraw-amount').fill(String(amount));
    await this.page.getByTestId('tx-form-withdraw-submit').click();
  }
  async transfer(from: string | RegExp, to: string | RegExp, amount: number | string) {
    await this.openNew('transfer');
    await selectOption(this.page, 'tx-form-transfer-from', from, searchOf(from));
    await selectOption(this.page, 'tx-form-transfer-to', to, searchOf(to));
    await this.page.getByTestId('tx-form-transfer-amount').fill(String(amount));
    await this.page.getByTestId('tx-form-transfer-submit').click();
  }
  async reject(id: string, reason: string) {
    await this.page.getByTestId(`tx-reject-${id}`).click();
    await expect(this.page.getByTestId('reject-modal')).toBeVisible();
    await this.page.getByTestId('reject-reason').fill(reason);
    await this.page.getByTestId('reject-submit').click();
  }
  async confirm() { await confirmOk(this.page); }
}
