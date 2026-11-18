import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertCustomerFound } from '../../../../domain/customer.rules';
import { Customer } from '../../../../infrastructure/persistence/entities';
import { SetKycStatusCommand } from './set-kyc-status.command';

@CommandHandler(SetKycStatusCommand)
export class SetKycStatusHandler implements ICommandHandler<SetKycStatusCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id, status }: SetKycStatusCommand): Promise<Customer> {
    const repo = this.dataSource.getRepository(Customer);
    const customer = assertCustomerFound(await repo.findOne({ where: { id } }), id);
    customer.kycStatus = status;
    return repo.save(customer);
  }
}
