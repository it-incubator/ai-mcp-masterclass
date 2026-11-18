// Read model shared by every transaction use case: a Transaction enriched with account/customer names and risk levels.
import { DataSource, EntityManager } from 'typeorm';
import { assertTransactionFound } from '../../../domain/transaction.rules';
import { Transaction } from '../../../infrastructure/persistence/entities';

export const TRANSACTION_RELATIONS = { fromAccount: { customer: true }, toAccount: { customer: true } } as const;

export function toTransactionItem(t: Transaction) {
  const { fromAccount, toAccount, ...rest } = t;
  const fullName = (a: typeof fromAccount) => (a?.customer ? `${a.customer.firstName} ${a.customer.lastName}` : null);
  return {
    ...rest,
    fromAccountName: fromAccount?.name ?? null,
    toAccountName: toAccount?.name ?? null,
    fromCustomerName: fullName(fromAccount),
    toCustomerName: fullName(toAccount),
    fromCustomerRiskLevel: fromAccount?.customer?.riskLevel ?? null,
    toCustomerRiskLevel: toAccount?.customer?.riskLevel ?? null,
  };
}

export async function loadTransactionItem(db: EntityManager | DataSource, id: string) {
  const t = await db.getRepository(Transaction).findOne({ where: { id }, relations: TRANSACTION_RELATIONS });
  return toTransactionItem(assertTransactionFound(t, id));
}
