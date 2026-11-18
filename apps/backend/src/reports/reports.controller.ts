// NOTE(masterclass): logic lives in the controller on purpose
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { fromCents, toCents } from '../common/money';
import { Account, AccountStatus, Currency, Customer, KycStatus, Transaction, TransactionStatus } from '../entities';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary: customers, accounts, balances, pending queue, 30-day volume' })
  async summary() {
    const currencies = Object.values(Currency);
    const zeroByCurrency = () => Object.fromEntries(currencies.map((c) => [c, 0])) as Record<Currency, number>;

    const kycRows: { key: KycStatus; n: string }[] = await this.dataSource
      .getRepository(Customer)
      .createQueryBuilder('c')
      .select('c."kycStatus"', 'key')
      .addSelect('COUNT(*)', 'n')
      .groupBy('c."kycStatus"')
      .getRawMany();
    const customersByKyc = Object.fromEntries(Object.values(KycStatus).map((k) => [k, 0])) as Record<KycStatus, number>;
    for (const r of kycRows) customersByKyc[r.key] = Number(r.n);

    const statusRows: { key: AccountStatus; n: string }[] = await this.dataSource
      .getRepository(Account)
      .createQueryBuilder('a')
      .select('a.status', 'key')
      .addSelect('COUNT(*)', 'n')
      .groupBy('a.status')
      .getRawMany();
    const accountsByStatus = Object.fromEntries(Object.values(AccountStatus).map((s) => [s, 0])) as Record<AccountStatus, number>;
    for (const r of statusRows) accountsByStatus[r.key] = Number(r.n);

    const balanceRows: { key: Currency; sum: string }[] = await this.dataSource
      .getRepository(Account)
      .createQueryBuilder('a')
      .select('a.currency', 'key')
      .addSelect('COALESCE(SUM(a.balance), 0)', 'sum')
      .groupBy('a.currency')
      .getRawMany();
    const totalBalanceByCurrency = zeroByCurrency();
    for (const r of balanceRows) totalBalanceByCurrency[r.key] = fromCents(toCents(r.sum));

    const pendingRows: { key: Currency; n: string; sum: string }[] = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select('t.currency', 'key')
      .addSelect('COUNT(*)', 'n')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'sum')
      .where('t.status = :status', { status: TransactionStatus.PENDING })
      .groupBy('t.currency')
      .getRawMany();
    const pendingAmountByCurrency = zeroByCurrency();
    let pendingTransactions = 0;
    for (const r of pendingRows) {
      pendingTransactions += Number(r.n);
      pendingAmountByCurrency[r.key] = fromCents(toCents(r.sum));
    }

    const volumeRows: { key: Currency; sum: string }[] = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select('t.currency', 'key')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'sum')
      .where('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t."createdAt" >= :since', { since: new Date(Date.now() - THIRTY_DAYS_MS) })
      .groupBy('t.currency')
      .getRawMany();
    const volumeLast30Days = zeroByCurrency();
    for (const r of volumeRows) volumeLast30Days[r.key] = fromCents(toCents(r.sum));

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
}
