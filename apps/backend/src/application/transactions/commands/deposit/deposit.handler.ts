import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound, assertActive, credit } from '../../../../domain/account.rules';
import { TransactionStatus, TransactionType } from '../../../../domain/enums';
import { fromCents, toCents } from '../../../../domain/money';
import { Account, Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { DepositCommand } from './deposit.command';

@CommandHandler(DepositCommand)
export class DepositHandler implements ICommandHandler<DepositCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: DepositCommand) {
    const id = await this.dataSource.transaction(async (manager) => {
      const account = assertAccountFound(
        await manager.findOne(Account, { where: { id: cmd.accountId }, lock: { mode: 'pessimistic_write' } }),
        cmd.accountId,
      );
      assertActive(account);
      const cents = toCents(cmd.amount);
      credit(account, cents);
      await manager.save(account);
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: account.currency,
          fromAccountId: null,
          toAccountId: account.id,
          description: cmd.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
