import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { emailTaken } from '../../../../domain/customer.rules';
import { KycStatus, RiskLevel } from '../../../../domain/enums';
import { Customer } from '../../../../infrastructure/persistence/entities';
import { CreateCustomerCommand } from './create-customer.command';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: CreateCustomerCommand): Promise<Customer> {
    const repo = this.dataSource.getRepository(Customer);
    if (await repo.findOne({ where: { email: cmd.email } })) throw emailTaken(cmd.email);
    const customer = repo.create({
      firstName: cmd.firstName,
      lastName: cmd.lastName,
      email: cmd.email,
      phone: cmd.phone ?? null,
      country: cmd.country,
      kycStatus: KycStatus.PENDING,
      riskLevel: cmd.riskLevel ?? RiskLevel.LOW,
    });
    try {
      return await repo.save(customer);
    } catch (e: any) {
      if (e?.code === '23505') throw emailTaken(cmd.email); // lost a race against a concurrent insert
      throw e;
    }
  }
}
