// NOTE(masterclass): logic lives in the controller on purpose
import {
  Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query, UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toCents } from '../common/money';
import { Account, AccountStatus, Customer, KycStatus, Transaction, TransactionStatus } from '../entities';
import { ListAccountsQueryDto, OpenAccountDto } from './accounts.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'List accounts (filters, pagination); items include customerName' })
  async list(@Query() q: ListAccountsQueryDto) {
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

  @Get(':id')
  @ApiOperation({ summary: 'Get account with customer summary' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    const account = await this.dataSource.getRepository(Account).findOne({ where: { id }, relations: { customer: true } });
    if (!account) throw new NotFoundException(`Account with id ${id} not found`);
    const { customer, ...rest } = account;
    return {
      ...rest,
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

  @Post()
  @ApiOperation({ summary: 'Open an account (customer must be KYC VERIFIED); starts ACTIVE with balance 0' })
  async open(@Body() dto: OpenAccountDto) {
    const customer = await this.dataSource.getRepository(Customer).findOne({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer with id ${dto.customerId} not found`);
    if (customer.kycStatus !== KycStatus.VERIFIED) {
      throw new UnprocessableEntityException('Account can be opened only for customers with VERIFIED KYC status');
    }
    const repo = this.dataSource.getRepository(Account);
    return repo.save(
      repo.create({ customerId: customer.id, currency: dto.currency, name: dto.name, balance: 0, status: AccountStatus.ACTIVE }),
    );
  }

  @Post(':id/freeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Freeze an ACTIVE account' })
  async freeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!account) throw new NotFoundException(`Account with id ${id} not found`);
      if (account.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException(`Only ACTIVE accounts can be frozen (current status: ${account.status})`);
      }
      account.status = AccountStatus.FROZEN;
      return manager.save(account);
    });
  }

  @Post(':id/unfreeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unfreeze a FROZEN account' })
  async unfreeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!account) throw new NotFoundException(`Account with id ${id} not found`);
      if (account.status !== AccountStatus.FROZEN) {
        throw new UnprocessableEntityException(`Only FROZEN accounts can be unfrozen (current status: ${account.status})`);
      }
      account.status = AccountStatus.ACTIVE;
      return manager.save(account);
    });
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Close an account (zero balance, no PENDING transactions)' })
  async close(@Param('id', ParseUUIDPipe) id: string) {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!account) throw new NotFoundException(`Account with id ${id} not found`);
      if (account.status === AccountStatus.CLOSED) {
        throw new UnprocessableEntityException('Account is already closed');
      }
      if (toCents(account.balance) !== 0) {
        throw new UnprocessableEntityException('Account can be closed only when its balance is zero');
      }
      const pending = await manager
        .getRepository(Transaction)
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TransactionStatus.PENDING })
        .andWhere('(t."fromAccountId" = :id OR t."toAccountId" = :id)', { id })
        .getCount();
      if (pending > 0) {
        throw new UnprocessableEntityException('Account cannot be closed while it has PENDING transactions');
      }
      account.status = AccountStatus.CLOSED;
      return manager.save(account);
    });
  }
}
