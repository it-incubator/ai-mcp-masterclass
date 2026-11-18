// Money-movement rules shared by Deposit / Withdraw / Transfer / Approve / Reject / Reverse.
import { AccountState, assertActive, assertSameCurrency, assertSufficientFunds, credit, debit } from './account.rules';
import { TransactionStatus, TransactionType } from './enums';
import { BusinessRuleError, NotFoundError } from './errors';

/** Transfers of this amount or more need a second pair of eyes (created PENDING). */
export const FOUR_EYES_THRESHOLD_CENTS = 10000 * 100;
export const requiresFourEyes = (cents: number): boolean => cents >= FOUR_EYES_THRESHOLD_CENTS;

export interface TransactionState {
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fromAccountId: string | null;
  toAccountId: string | null;
  rejectionReason: string | null;
}

export function assertDistinctAccounts(fromId: string, toId: string): void {
  if (fromId === toId) throw new BusinessRuleError('Source and destination accounts must be different');
}

export function assertTransactionFound<T>(tx: T | null | undefined, id: string): T {
  if (!tx) throw new NotFoundError('Transaction', id);
  return tx;
}

/** Shared by Transfer (create) and ApproveTransaction (re-check): both ACTIVE, same currency, enough funds. */
export function assertTransferable(from: AccountState, to: AccountState, cents: number): void {
  assertActive(from);
  assertActive(to);
  assertSameCurrency(from, to);
  assertSufficientFunds(from, cents);
}

export function moveFunds(from: AccountState, to: AccountState, cents: number): void {
  debit(from, cents);
  credit(to, cents);
}

export function approve(tx: TransactionState): void {
  assertStatus(tx, TransactionStatus.PENDING, 'approved');
  tx.status = TransactionStatus.COMPLETED;
}

export function reject(tx: TransactionState, reason: string): void {
  assertStatus(tx, TransactionStatus.PENDING, 'rejected');
  tx.status = TransactionStatus.REJECTED;
  tx.rejectionReason = reason;
}

/** Status guard that runs BEFORE accounts are loaded (cheap fail-fast). */
export function assertStatus(tx: TransactionState, expected: TransactionStatus, verb: string): void {
  if (tx.status !== expected) {
    throw new BusinessRuleError(`Only ${expected} transactions can be ${verb} (current status: ${tx.status})`);
  }
}

/**
 * Reverse a COMPLETED transaction in place: inverse money movement.
 * DEPOSIT: receiver ACTIVE + funds, debit. WITHDRAWAL: payer ACTIVE, credit. TRANSFER: both ACTIVE, receiver funds, move back.
 */
export function reverse(tx: TransactionState, from: AccountState | undefined, to: AccountState | undefined): void {
  assertStatus(tx, TransactionStatus.COMPLETED, 'reversed');
  const cents = Math.round(tx.amount * 100);
  if (tx.type === TransactionType.DEPOSIT) {
    if (!to) throw new NotFoundError('Account', tx.toAccountId);
    assertActive(to);
    assertSufficientFunds(to, cents);
    debit(to, cents);
  } else if (tx.type === TransactionType.WITHDRAWAL) {
    if (!from) throw new NotFoundError('Account', tx.fromAccountId);
    assertActive(from);
    credit(from, cents);
  } else {
    if (!from) throw new NotFoundError('Account', tx.fromAccountId);
    if (!to) throw new NotFoundError('Account', tx.toAccountId);
    assertActive(from);
    assertActive(to);
    assertSufficientFunds(to, cents);
    moveFunds(to, from, cents);
  }
  tx.status = TransactionStatus.REVERSED;
}
