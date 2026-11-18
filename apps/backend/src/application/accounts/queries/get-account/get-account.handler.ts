import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { assertAccountFound } from '../../../../domain/account.rules';
import { Account } from '../../../../infrastructure/persistence/entities';
import { GetAccountQuery } from './get-account.query';

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute({ id }: GetAccountQuery) {
    const found = await this.dataSource.getRepository(Account).findOne({ where: { id }, relations: { customer: true } });
    const { customer, ...account } = assertAccountFound(found, id);
    return {
      ...account,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        kycStatus: customer.kycStatus,
        riskLevel: customer.riskLevel,
      },
    };
  }
}
