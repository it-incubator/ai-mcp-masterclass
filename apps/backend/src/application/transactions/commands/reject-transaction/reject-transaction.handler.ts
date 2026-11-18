import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertTransactionFound, reject } from '../../../../domain/transaction.rules';
import { Transaction } from '../../../../infrastructure/persistence/entities';
import { loadTransactionItem } from '../../shared/transaction-item';
import { RejectTransactionCommand } from './reject-transaction.command';

@CommandHandler(RejectTransactionCommand)
export class RejectTransactionHandler implements ICommandHandler<RejectTransactionCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id, reason }: RejectTransactionCommand) {
    await this.dataSource.transaction(async (manager) => {
      const tx = assertTransactionFound(
        await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      reject(tx, reason); // PENDING only; no money moves
      await manager.save(tx);
    });
    return loadTransactionItem(this.dataSource, id);
  }
}
