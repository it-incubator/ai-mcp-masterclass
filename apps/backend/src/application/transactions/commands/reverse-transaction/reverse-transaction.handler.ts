import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionStatus } from '../../../../domain/enums';
import { assertStatus, assertTransactionFound, reverse } from '../../../../domain/transaction.rules';
import { lockAccounts } from '../../../../infrastructure/persistence/account-locks';
import { Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { ReverseTransactionCommand } from './reverse-transaction.command';

@CommandHandler(ReverseTransactionCommand)
export class ReverseTransactionHandler implements ICommandHandler<ReverseTransactionCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id }: ReverseTransactionCommand) {
    await this.dataSource.transaction(async (manager) => {
      const tx = assertTransactionFound(
        await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      assertStatus(tx, TransactionStatus.COMPLETED, 'reversed');
      const accounts = await lockAccounts(manager, [tx.fromAccountId, tx.toAccountId]);
      const from = accounts.find((a) => a.id === tx.fromAccountId);
      const to = accounts.find((a) => a.id === tx.toAccountId);

      reverse(tx, from, to); // inverse money movement + status REVERSED (rules live in the domain)
      await manager.save(accounts);
      await manager.save(tx);
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
