import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Account } from '../../../../infrastructure/persistence/entities';
import { ListAccountsQuery } from './list-accounts.query';

@QueryHandler(ListAccountsQuery)
export class ListAccountsHandler implements IQueryHandler<ListAccountsQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(q: ListAccountsQuery) {
    const qb = this.dataSource
      .getRepository(Account)
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.customer', 'c');
    if (q.customerId) qb.andWhere('a."customerId" = :customerId', { customerId: q.customerId });
    if (q.status) qb.andWhere('a.status = :status', { status: q.status });
    if (q.currency) qb.andWhere('a.currency = :currency', { currency: q.currency });
    qb.orderBy('c.lastName', 'ASC')
      .addOrderBy('c.firstName', 'ASC')
      .addOrderBy('a.createdAt', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map(({ customer, ...account }) => ({
      ...account,
      customerName: `${customer.firstName} ${customer.lastName}`,
    }));
    return { items, total, page: q.page, limit: q.limit };
  }
}
