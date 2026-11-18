import { EntityManager, In } from 'typeorm';
import { Account } from './entities';

/** Lock accounts in id order (avoids deadlocks) inside the surrounding DB transaction. */
export function lockAccounts(manager: EntityManager, ids: (string | null)[]): Promise<Account[]> {
  return manager.find(Account, {
    where: { id: In(ids.filter((x): x is string => !!x)) },
    order: { id: 'ASC' },
    lock: { mode: 'pessimistic_write' },
  });
}
