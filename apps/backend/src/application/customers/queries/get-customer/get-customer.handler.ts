import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertCustomerFound } from '../../../../domain/customer.rules';
import { Customer } from '../../../../infrastructure/persistence/entities';
import { GetCustomerQuery } from './get-customer.query';

@QueryHandler(GetCustomerQuery)
export class GetCustomerHandler implements IQueryHandler<GetCustomerQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id }: GetCustomerQuery) {
    const customer = await this.dataSource.getRepository(Customer).findOne({
      where: { id },
      relations: { accounts: true },
      order: { accounts: { createdAt: 'ASC' } },
    });
    return assertCustomerFound(customer, id);
  }
}
