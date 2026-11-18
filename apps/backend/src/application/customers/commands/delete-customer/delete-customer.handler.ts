import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAllAccountsClosed, assertCustomerFound, assertNoTransactionHistory } from '../../../../domain/customer.rules';
import { Account, Customer, Transaction } from '../../../../infrastructure/persistence/entities';
import { DeleteCustomerCommand } from './delete-customer.command';

@CommandHandler(DeleteCustomerCommand)
export class DeleteCustomerHandler implements ICommandHandler<DeleteCustomerCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id }: DeleteCustomerCommand): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, { where: { id }, lock: { mode: 'pessimistic_write' } });
      assertCustomerFound(customer, id);

      const accounts = await manager.find(Account, { where: { customerId: id } });
      assertAllAccountsClosed(accounts);
      if (accounts.length > 0) {
        const ids = accounts.map((a) => a.id);
        const txCount = await manager
          .getRepository(Transaction)
          .createQueryBuilder('t')
          .where('t."fromAccountId" IN (:...ids) OR t."toAccountId" IN (:...ids)', { ids })
          .getCount();
        assertNoTransactionHistory(txCount);
        await manager.delete(Account, ids);
      }
      await manager.delete(Customer, id);
    });
  }
}
