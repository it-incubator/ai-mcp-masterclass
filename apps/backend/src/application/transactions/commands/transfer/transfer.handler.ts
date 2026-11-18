import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound } from '../../../../domain/account.rules';
import { TransactionStatus, TransactionType } from '../../../../domain/enums';
import { fromCents, toCents } from '../../../../domain/money';
import { assertDistinctAccounts, assertTransferable, moveFunds, requiresFourEyes } from '../../../../domain/transaction.rules';
import { lockAccounts } from '../../../../infrastructure/persistence/account-locks';
import { Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { TransferCommand } from './transfer.command';

@CommandHandler(TransferCommand)
export class TransferHandler implements ICommandHandler<TransferCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: TransferCommand) {
    assertDistinctAccounts(cmd.fromAccountId, cmd.toAccountId);
    const id = await this.dataSource.transaction(async (manager) => {
      const locked = await lockAccounts(manager, [cmd.fromAccountId, cmd.toAccountId]);
      const from = assertAccountFound(locked.find((a) => a.id === cmd.fromAccountId), cmd.fromAccountId);
      const to = assertAccountFound(locked.find((a) => a.id === cmd.toAccountId), cmd.toAccountId);
      const cents = toCents(cmd.amount);
      assertTransferable(from, to, cents);

      const needsApproval = requiresFourEyes(cents); // four-eyes: PENDING, no money moves yet
      if (!needsApproval) {
        moveFunds(from, to, cents);
        await manager.save([from, to]);
      }
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.TRANSFER,
          status: needsApproval ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: from.currency,
          fromAccountId: from.id,
          toAccountId: to.id,
          description: cmd.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
