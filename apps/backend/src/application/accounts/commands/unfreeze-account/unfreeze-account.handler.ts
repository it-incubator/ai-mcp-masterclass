import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound, unfreeze } from '../../../../domain/account.rules';
import { Account } from '../../../../infrastructure/persistence/entities';
import { UnfreezeAccountCommand } from './unfreeze-account.command';

@CommandHandler(UnfreezeAccountCommand)
export class UnfreezeAccountHandler implements ICommandHandler<UnfreezeAccountCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  execute({ id }: UnfreezeAccountCommand): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const account = assertAccountFound(
        await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } }),
        id,
      );
      unfreeze(account);
      return manager.save(account);
    });
  }
}
