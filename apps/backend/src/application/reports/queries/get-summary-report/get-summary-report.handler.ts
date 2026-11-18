import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountStatus, Currency, KycStatus, TransactionStatus } from '../../../../domain/enums';
import { fromCents, toCents } from '../../../../domain/money';
import { Account, Customer, Transaction } from '../../../../infrastructure/persistence/entities';
import { GetSummaryReportQuery } from './get-summary-report.query';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
type Row = { key: string; n?: string; sum?: string };
const zeroed = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

@QueryHandler(GetSummaryReportQuery)
export class GetSummaryReportHandler implements IQueryHandler<GetSummaryReportQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(_query: GetSummaryReportQuery) {
    const currencies = Object.values(Currency);
    const customersByKyc = zeroed(Object.values(KycStatus));
    for (const r of await this.group(Customer, 'c', 'c."kycStatus"', 'COUNT(*)')) customersByKyc[r.key as KycStatus] = Number(r.n);

    const accountsByStatus = zeroed(Object.values(AccountStatus));
    for (const r of await this.group(Account, 'a', 'a.status', 'COUNT(*)')) accountsByStatus[r.key as AccountStatus] = Number(r.n);

    const totalBalanceByCurrency = zeroed(currencies);
    for (const r of await this.group(Account, 'a', 'a.currency', 'COALESCE(SUM(a.balance), 0)')) {
      totalBalanceByCurrency[r.key as Currency] = fromCents(toCents(r.sum!));
    }

    const pendingAmountByCurrency = zeroed(currencies);
    let pendingTransactions = 0;
    const pendingRows = await this.group(Transaction, 't', 't.currency', 'COALESCE(SUM(t.amount), 0)', (qb) =>
      qb.where('t.status = :status', { status: TransactionStatus.PENDING }));
    for (const r of pendingRows) {
      pendingTransactions += Number(r.n);
      pendingAmountByCurrency[r.key as Currency] = fromCents(toCents(r.sum!));
    }

    const volumeLast30Days = zeroed(currencies);
    const volumeRows = await this.group(Transaction, 't', 't.currency', 'COALESCE(SUM(t.amount), 0)', (qb) =>
      qb.where('t.status = :status', { status: TransactionStatus.COMPLETED })
        .andWhere('t."createdAt" >= :since', { since: new Date(Date.now() - THIRTY_DAYS_MS) }));
    for (const r of volumeRows) volumeLast30Days[r.key as Currency] = fromCents(toCents(r.sum!));

    return {
      customersTotal: Object.values(customersByKyc).reduce((a, b) => a + b, 0),
      customersByKyc,
      accountsTotal: Object.values(accountsByStatus).reduce((a, b) => a + b, 0),
      accountsByStatus,
      totalBalanceByCurrency,
      pendingTransactions,
      pendingAmountByCurrency,
      volumeLast30Days,
    };
  }

  /** GROUP BY helper: returns rows {key, n (count), sum}. */
  private group(entity: Function, alias: string, keyExpr: string, sumExpr: string, where?: (qb: any) => any): Promise<Row[]> {
    const qb = this.dataSource.getRepository(entity as any).createQueryBuilder(alias)
      .select(keyExpr, 'key').addSelect('COUNT(*)', 'n').addSelect(sumExpr, 'sum');
    where?.(qb);
    return qb.groupBy(keyExpr).getRawMany();
  }
}
