import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertCustomerFound, emailTaken } from '../../../../domain/customer.rules';
import { Customer } from '../../../../infrastructure/persistence/entities';
import { UpdateCustomerCommand } from './update-customer.command';

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(cmd: UpdateCustomerCommand): Promise<Customer> {
    const repo = this.dataSource.getRepository(Customer);
    const customer = assertCustomerFound(await repo.findOne({ where: { id: cmd.id } }), cmd.id);
    if (cmd.email !== undefined && cmd.email !== customer.email && (await repo.findOne({ where: { email: cmd.email } }))) {
      throw emailTaken(cmd.email);
    }
    if (cmd.firstName !== undefined) customer.firstName = cmd.firstName;
    if (cmd.lastName !== undefined) customer.lastName = cmd.lastName;
    if (cmd.email !== undefined) customer.email = cmd.email;
    if (cmd.phone !== undefined) customer.phone = cmd.phone;
    if (cmd.country !== undefined) customer.country = cmd.country;
    if (cmd.riskLevel !== undefined) customer.riskLevel = cmd.riskLevel;
    try {
      return await repo.save(customer);
    } catch (e: any) {
      if (e?.code === '23505') throw emailTaken(cmd.email ?? customer.email);
      throw e;
    }
  }
}
