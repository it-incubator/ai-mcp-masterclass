import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound, close } from '../../../../domain/account.rules';
import { TransactionStatus } from '../../../../domain/enums';
import { Account, Transaction } from '../../../../infrastructure/persistence/entities';
import { CloseAccountCommand } from './close-account.command';

@CommandHandler(CloseAccountCommand)
export class CloseAccountHandler implements ICommandHandler<CloseAccountCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  execute({ id }: CloseAccountCommand): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const account = assertAccountFound(
        await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      const pending = await manager
        .getRepository(Transaction)
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TransactionStatus.PENDING })
        .andWhere('(t."fromAccountId" = :id OR t."toAccountId" = :id)', { id })
        .getCount();
      close(account, pending);
      return manager.save(account);
    });
  }
}
