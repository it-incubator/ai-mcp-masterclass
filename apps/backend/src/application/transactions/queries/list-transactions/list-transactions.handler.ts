import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Transaction } from '../../../../infrastructure/persistence/entities';
import { toTransactionItem } from '../../shared/transaction-item';
import { ListTransactionsQuery } from './list-transactions.query';

@QueryHandler(ListTransactionsQuery)
export class ListTransactionsHandler implements IQueryHandler<ListTransactionsQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(q: ListTransactionsQuery) {
    const qb = this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromAccount', 'fa')
      .leftJoinAndSelect('fa.customer', 'fc')
      .leftJoinAndSelect('t.toAccount', 'ta')
      .leftJoinAndSelect('ta.customer', 'tc');
    if (q.status) qb.andWhere('t.status = :status', { status: q.status });
    if (q.type) qb.andWhere('t.type = :type', { type: q.type });
    if (q.accountId) qb.andWhere('(t."fromAccountId" = :accountId OR t."toAccountId" = :accountId)', { accountId: q.accountId });
    if (q.customerId) qb.andWhere('(fc.id = :customerId OR tc.id = :customerId)', { customerId: q.customerId });
    if (q.customerRiskLevel) {
      qb.andWhere('(fc."riskLevel" = :anyRisk OR tc."riskLevel" = :anyRisk)', { anyRisk: q.customerRiskLevel });
    }
    if (q.fromCustomerRiskLevel) qb.andWhere('fc."riskLevel" = :fromRisk', { fromRisk: q.fromCustomerRiskLevel });
    if (q.minAmount !== undefined) qb.andWhere('t.amount >= :minAmount', { minAmount: q.minAmount });
    if (q.maxAmount !== undefined) qb.andWhere('t.amount <= :maxAmount', { maxAmount: q.maxAmount });
    if (q.dateFrom) qb.andWhere('t."createdAt" >= :dateFrom', { dateFrom: new Date(q.dateFrom) });
    if (q.dateTo) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(q.dateTo)) {
        const end = new Date(q.dateTo);
        end.setUTCDate(end.getUTCDate() + 1); // a plain date includes the whole day (UTC)
        qb.andWhere('t."createdAt" < :dateToExcl', { dateToExcl: end });
      } else {
        qb.andWhere('t."createdAt" <= :dateTo', { dateTo: new Date(q.dateTo) });
      }
    }
    qb.orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(toTransactionItem), total, page: q.page, limit: q.limit };
  }
}
