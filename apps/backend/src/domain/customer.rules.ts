import { AccountStatus, KycStatus } from './enums';
import { BusinessRuleError, ConflictError, NotFoundError } from './errors';

export const emailTaken = (email: string) => new ConflictError(`Customer with email ${email} already exists`);

export function assertCustomerFound<T>(customer: T | null | undefined, id: string): T {
  if (!customer) throw new NotFoundError('Customer', id);
  return customer;
}

export function assertKycVerified(customer: { kycStatus: KycStatus }): void {
  if (customer.kycStatus !== KycStatus.VERIFIED) {
    throw new BusinessRuleError('Account can be opened only for customers with VERIFIED KYC status');
  }
}

/** A customer can be deleted only when every account is CLOSED... */
export function assertAllAccountsClosed(accounts: { status: AccountStatus }[]): void {
  if (accounts.some((a) => a.status !== AccountStatus.CLOSED)) {
    throw new ConflictError('Customer has ACTIVE or FROZEN accounts and cannot be deleted');
  }
}

/** ...and none of them has ever had a transaction. */
export function assertNoTransactionHistory(transactionCount: number): void {
  if (transactionCount > 0) throw new ConflictError('Customer has accounts with transactions and cannot be deleted');
}
