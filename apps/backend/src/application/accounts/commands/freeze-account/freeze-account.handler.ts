import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound, freeze } from '../../../../domain/account.rules';
import { Account } from '../../../../infrastructure/persistence/entities';
import { FreezeAccountCommand } from './freeze-account.command';

@CommandHandler(FreezeAccountCommand)
export class FreezeAccountHandler implements ICommandHandler<FreezeAccountCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  execute({ id }: FreezeAccountCommand): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const account = assertAccountFound(
        await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      freeze(account);
      return manager.save(account);
    });
  }
}
