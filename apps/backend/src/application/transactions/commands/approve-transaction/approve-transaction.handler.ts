import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound } from '../../../../domain/account.rules';
import { TransactionStatus } from '../../../../domain/enums';
import { toCents } from '../../../../domain/money';
import {
  approve, assertStatus, assertTransactionFound, assertTransferable, moveFunds,
} from '../../../../domain/transaction.rules';
import { lockAccounts } from '../../../../infrastructure/persistence/account-locks';
import { Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { ApproveTransactionCommand } from './approve-transaction.command';

@CommandHandler(ApproveTransactionCommand)
export class ApproveTransactionHandler implements ICommandHandler<ApproveTransactionCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id }: ApproveTransactionCommand) {
    await this.dataSource.transaction(async (manager) => {
      const tx = assertTransactionFound(
        await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      assertStatus(tx, TransactionStatus.PENDING, 'approved');
      const locked = await lockAccounts(manager, [tx.fromAccountId, tx.toAccountId]);
      const from = assertAccountFound(locked.find((a) => a.id === tx.fromAccountId), tx.fromAccountId);
      const to = assertAccountFound(locked.find((a) => a.id === tx.toAccountId), tx.toAccountId);

      const cents = toCents(tx.amount);
      assertTransferable(from, to, cents); // re-check: accounts may have changed since the transfer was created
      moveFunds(from, to, cents);
      await manager.save([from, to]);
      approve(tx);
      await manager.save(tx);
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
