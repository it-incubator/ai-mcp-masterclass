import { AccountStatus, Currency } from './enums';
import { BusinessRuleError, NotFoundError } from './errors';
import { formatCents, fromCents, toCents } from './money';

export interface AccountState { id: string; status: AccountStatus; currency: Currency; balance: number }

export function assertAccountFound<T>(account: T | null | undefined, id: string | null): T {
  if (!account) throw new NotFoundError('Account', id);
  return account;
}

export function assertActive(account: AccountState): void {
  if (account.status !== AccountStatus.ACTIVE) {
    throw new BusinessRuleError(`Account ${account.id} must be ACTIVE (current status: ${account.status})`);
  }
}

export function assertSameCurrency(from: AccountState, to: AccountState): void {
  if (from.currency !== to.currency) {
    throw new BusinessRuleError(`Accounts must have the same currency (source ${from.currency}, destination ${to.currency})`);
  }
}

export function assertSufficientFunds(account: AccountState, cents: number): void {
  const balance = toCents(account.balance);
  if (balance < cents) {
    throw new BusinessRuleError(
      `Insufficient funds on account ${account.id}: balance ${formatCents(balance)}, required ${formatCents(cents)}`,
    );
  }
}

export const credit = (account: AccountState, cents: number): void => {
  account.balance = fromCents(toCents(account.balance) + cents);
};
export const debit = (account: AccountState, cents: number): void => {
  account.balance = fromCents(toCents(account.balance) - cents);
};

export function freeze(account: AccountState): void {
  if (account.status !== AccountStatus.ACTIVE) {
    throw new BusinessRuleError(`Only ACTIVE accounts can be frozen (current status: ${account.status})`);
  }
  account.status = AccountStatus.FROZEN;
}

export function unfreeze(account: AccountState): void {
  if (account.status !== AccountStatus.FROZEN) {
    throw new BusinessRuleError(`Only FROZEN accounts can be unfrozen (current status: ${account.status})`);
  }
  account.status = AccountStatus.ACTIVE;
}

export function close(account: AccountState, pendingTransactions: number): void {
  if (account.status === AccountStatus.CLOSED) throw new BusinessRuleError('Account is already closed');
  if (toCents(account.balance) !== 0) throw new BusinessRuleError('Account can be closed only when its balance is zero');
  if (pendingTransactions > 0) throw new BusinessRuleError('Account cannot be closed while it has PENDING transactions');
  account.status = AccountStatus.CLOSED;
}
