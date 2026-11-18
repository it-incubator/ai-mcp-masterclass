import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Customer } from '../../../../infrastructure/persistence/entities';
import { ListCustomersQuery } from './list-customers.query';

@QueryHandler(ListCustomersQuery)
export class ListCustomersHandler implements IQueryHandler<ListCustomersQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(q: ListCustomersQuery) {
    const qb = this.dataSource.getRepository(Customer).createQueryBuilder('c');
    if (q.search) {
      qb.andWhere(
        `(c."firstName" ILIKE :s OR c."lastName" ILIKE :s OR c.email ILIKE :s OR (c."firstName" || ' ' || c."lastName") ILIKE :s)`,
        { s: `%${q.search.replace(/[\\%_]/g, '\\$&')}%` },
      );
    }
    if (q.kycStatus) qb.andWhere('c."kycStatus" = :kyc', { kyc: q.kycStatus });
    if (q.riskLevel) qb.andWhere('c."riskLevel" = :risk', { risk: q.riskLevel });
    if (q.country) qb.andWhere('c.country = :country', { country: q.country });
    if (q.hasPendingTransactions === true) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM accounts a JOIN transactions t ON (t."fromAccountId" = a.id OR t."toAccountId" = a.id)
                 WHERE a."customerId" = c.id AND t.status = 'PENDING')`,
      );
    }
    qb.loadRelationCountAndMap('c.accountsCount', 'c.accounts')
      .orderBy('c.lastName', 'ASC')
      .addOrderBy('c.firstName', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: q.page, limit: q.limit };
  }
}
