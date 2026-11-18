import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound, assertActive, assertSufficientFunds, debit } from '../../../../domain/account.rules';
import { TransactionStatus, TransactionType } from '../../../../domain/enums';
import { fromCents, toCents } from '../../../../domain/money';
import { Account, Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { WithdrawCommand } from './withdraw.command';

@CommandHandler(WithdrawCommand)
export class WithdrawHandler implements ICommandHandler<WithdrawCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: WithdrawCommand) {
    const id = await this.dataSource.transaction(async (manager) => {
      const account = assertAccountFound(
        await manager.findOne(Account, { where: { id: cmd.accountId }, lock: { mode: 'pessimistic_write' } }),
        cmd.accountId,
      );
      assertActive(account);
      const cents = toCents(cmd.amount);
      assertSufficientFunds(account, cents);
      debit(account, cents);
      await manager.save(account);
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: account.currency,
          fromAccountId: account.id,
          toAccountId: null,
          description: cmd.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
