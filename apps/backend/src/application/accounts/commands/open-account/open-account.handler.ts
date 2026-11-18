import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertCustomerFound, assertKycVerified } from '../../../../domain/customer.rules';
import { AccountStatus } from '../../../../domain/enums';
import { Account, Customer } from '../../../../infrastructure/persistence/entities';
import { OpenAccountCommand } from './open-account.command';

@CommandHandler(OpenAccountCommand)
export class OpenAccountHandler implements ICommandHandler<OpenAccountCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: OpenAccountCommand): Promise<Account> {
    const customer = assertCustomerFound(
      await this.dataSource.getRepository(Customer).findOne({ where: { id: cmd.customerId } }),
      cmd.customerId,
    );
    assertKycVerified(customer);
    const repo = this.dataSource.getRepository(Account);
    return repo.save(
      repo.create({ customerId: customer.id, currency: cmd.currency, name: cmd.name, balance: 0, status: AccountStatus.ACTIVE }),
    );
  }
}
