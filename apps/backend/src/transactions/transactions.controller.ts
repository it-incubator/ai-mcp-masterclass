// NOTE(masterclass): logic lives in the controller on purpose
import {
  Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query, UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { fromCents, toCents } from '../common/money';
import { Account, AccountStatus, Transaction, TransactionStatus, TransactionType } from '../entities';
import {
  DepositDto, ListTransactionsQueryDto, RejectTransactionDto, TransferDto, WithdrawDto,
} from './transactions.dto';

/** Transfers of this amount or more need a second pair of eyes (created PENDING). */
const FOUR_EYES_THRESHOLD_CENTS = 10000 * 100;

/** Presentation-only mapping of a Transaction loaded with fromAccount/toAccount(+customer) relations. */
function toItem(t: Transaction) {
  const { fromAccount, toAccount, ...rest } = t;
  return {
    ...rest,
    fromAccountName: fromAccount?.name ?? null,
    toAccountName: toAccount?.name ?? null,
    fromCustomerName: fromAccount?.customer ? `${fromAccount.customer.firstName} ${fromAccount.customer.lastName}` : null,
    toCustomerName: toAccount?.customer ? `${toAccount.customer.firstName} ${toAccount.customer.lastName}` : null,
    fromCustomerRiskLevel: fromAccount?.customer?.riskLevel ?? null,
    toCustomerRiskLevel: toAccount?.customer?.riskLevel ?? null,
  };
}

async function loadItem(manager: EntityManager | DataSource, id: string) {
  const t = await manager.getRepository(Transaction).findOne({
    where: { id },
    relations: { fromAccount: { customer: true }, toAccount: { customer: true } },
  });
  if (!t) throw new NotFoundException(`Transaction with id ${id} not found`);
  return toItem(t);
}

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'List transactions, newest first (filters, pagination)' })
  async list(@Query() q: ListTransactionsQueryDto) {
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
        end.setUTCDate(end.getUTCDate() + 1);
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
    return { items: rows.map(toItem), total, page: q.page, limit: q.limit };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction (with account/customer names and risk levels)' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return loadItem(this.dataSource, id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit money to an ACTIVE account (completed immediately)' })
  async deposit(@Body() dto: DepositDto) {
    const id = await this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id: dto.accountId }, lock: { mode: 'pessimistic_write' } });
      if (!account) throw new NotFoundException(`Account with id ${dto.accountId} not found`);
      if (account.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException(`Account ${account.id} must be ACTIVE (current status: ${account.status})`);
      }
      const cents = toCents(dto.amount);
      account.balance = fromCents(toCents(account.balance) + cents);
      await manager.save(account);
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: account.currency,
          fromAccountId: null,
          toAccountId: account.id,
          description: dto.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadItem(this.dataSource, id);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw money from an ACTIVE account with sufficient funds (completed immediately)' })
  async withdraw(@Body() dto: WithdrawDto) {
    const id = await this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, { where: { id: dto.accountId }, lock: { mode: 'pessimistic_write' } });
      if (!account) throw new NotFoundException(`Account with id ${dto.accountId} not found`);
      if (account.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException(`Account ${account.id} must be ACTIVE (current status: ${account.status})`);
      }
      const cents = toCents(dto.amount);
      const balanceCents = toCents(account.balance);
      if (balanceCents < cents) {
        throw new UnprocessableEntityException(
          `Insufficient funds on account ${account.id}: balance ${fromCents(balanceCents).toFixed(2)}, required ${fromCents(cents).toFixed(2)}`,
        );
      }
      account.balance = fromCents(balanceCents - cents);
      await manager.save(account);
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: account.currency,
          fromAccountId: account.id,
          toAccountId: null,
          description: dto.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadItem(this.dataSource, id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer between two ACTIVE accounts of the same currency; amount >= 10000 is created PENDING (four-eyes)' })
  async transfer(@Body() dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new UnprocessableEntityException('Source and destination accounts must be different');
    }
    const id = await this.dataSource.transaction(async (manager) => {
      // lock both accounts in id order to avoid deadlocks
      const locked = await manager.find(Account, {
        where: { id: In([dto.fromAccountId, dto.toAccountId]) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const from = locked.find((a) => a.id === dto.fromAccountId);
      const to = locked.find((a) => a.id === dto.toAccountId);
      if (!from) throw new NotFoundException(`Account with id ${dto.fromAccountId} not found`);
      if (!to) throw new NotFoundException(`Account with id ${dto.toAccountId} not found`);
      for (const acc of [from, to]) {
        if (acc.status !== AccountStatus.ACTIVE) {
          throw new UnprocessableEntityException(`Account ${acc.id} must be ACTIVE (current status: ${acc.status})`);
        }
      }
      if (from.currency !== to.currency) {
        throw new UnprocessableEntityException(
          `Accounts must have the same currency (source ${from.currency}, destination ${to.currency})`,
        );
      }
      const cents = toCents(dto.amount);
      const fromCents_ = toCents(from.balance);
      if (fromCents_ < cents) {
        throw new UnprocessableEntityException(
          `Insufficient funds on account ${from.id}: balance ${fromCents(fromCents_).toFixed(2)}, required ${fromCents(cents).toFixed(2)}`,
        );
      }
      const needsApproval = cents >= FOUR_EYES_THRESHOLD_CENTS;
      if (!needsApproval) {
        from.balance = fromCents(fromCents_ - cents);
        to.balance = fromCents(toCents(to.balance) + cents);
        await manager.save([from, to]);
      }
      const tx = await manager.save(
        manager.create(Transaction, {
          type: TransactionType.TRANSFER,
          status: needsApproval ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
          amount: fromCents(cents),
          currency: from.currency,
          fromAccountId: from.id,
          toAccountId: to.id,
          description: dto.description ?? null,
        }),
      );
      return tx.id;
    });
    return loadItem(this.dataSource, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a PENDING transfer: re-checks accounts/funds and moves the money' })
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    await this.dataSource.transaction(async (manager) => {
      const tx = await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!tx) throw new NotFoundException(`Transaction with id ${id} not found`);
      if (tx.status !== TransactionStatus.PENDING) {
        throw new UnprocessableEntityException(`Only PENDING transactions can be approved (current status: ${tx.status})`);
      }
      const ids = [tx.fromAccountId!, tx.toAccountId!];
      const locked = await manager.find(Account, {
        where: { id: In(ids) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const from = locked.find((a) => a.id === tx.fromAccountId);
      const to = locked.find((a) => a.id === tx.toAccountId);
      if (!from) throw new NotFoundException(`Account with id ${tx.fromAccountId} not found`);
      if (!to) throw new NotFoundException(`Account with id ${tx.toAccountId} not found`);
      for (const acc of [from, to]) {
        if (acc.status !== AccountStatus.ACTIVE) {
          throw new UnprocessableEntityException(`Account ${acc.id} must be ACTIVE (current status: ${acc.status})`);
        }
      }
      const cents = toCents(tx.amount);
      const fromBalance = toCents(from.balance);
      if (fromBalance < cents) {
        throw new UnprocessableEntityException(
          `Insufficient funds on account ${from.id}: balance ${fromCents(fromBalance).toFixed(2)}, required ${fromCents(cents).toFixed(2)}`,
        );
      }
      from.balance = fromCents(fromBalance - cents);
      to.balance = fromCents(toCents(to.balance) + cents);
      await manager.save([from, to]);
      tx.status = TransactionStatus.COMPLETED;
      await manager.save(tx);
    });
    return loadItem(this.dataSource, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a PENDING transaction (reason required); no money moves' })
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectTransactionDto) {
    await this.dataSource.transaction(async (manager) => {
      const tx = await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!tx) throw new NotFoundException(`Transaction with id ${id} not found`);
      if (tx.status !== TransactionStatus.PENDING) {
        throw new UnprocessableEntityException(`Only PENDING transactions can be rejected (current status: ${tx.status})`);
      }
      tx.status = TransactionStatus.REJECTED;
      tx.rejectionReason = dto.reason;
      await manager.save(tx);
    });
    return loadItem(this.dataSource, id);
  }

  @Post(':id/reverse')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reverse a COMPLETED transaction in place (inverse money movement, status REVERSED)' })
  async reverse(@Param('id', ParseUUIDPipe) id: string) {
    await this.dataSource.transaction(async (manager) => {
      const tx = await manager.findOne(Transaction, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!tx) throw new NotFoundException(`Transaction with id ${id} not found`);
      if (tx.status !== TransactionStatus.COMPLETED) {
        throw new UnprocessableEntityException(`Only COMPLETED transactions can be reversed (current status: ${tx.status})`);
      }
      const accountIds = [tx.fromAccountId, tx.toAccountId].filter((x): x is string => !!x);
      const locked = await manager.find(Account, {
        where: { id: In(accountIds) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const from = locked.find((a) => a.id === tx.fromAccountId);
      const to = locked.find((a) => a.id === tx.toAccountId);
      const cents = toCents(tx.amount);

      if (tx.type === TransactionType.DEPOSIT) {
        if (!to) throw new NotFoundException(`Account with id ${tx.toAccountId} not found`);
        if (to.status !== AccountStatus.ACTIVE) {
          throw new UnprocessableEntityException(`Account ${to.id} must be ACTIVE (current status: ${to.status})`);
        }
        const bal = toCents(to.balance);
        if (bal < cents) {
          throw new UnprocessableEntityException(
            `Insufficient funds on account ${to.id}: balance ${fromCents(bal).toFixed(2)}, required ${fromCents(cents).toFixed(2)}`,
          );
        }
        to.balance = fromCents(bal - cents);
        await manager.save(to);
      } else if (tx.type === TransactionType.WITHDRAWAL) {
        if (!from) throw new NotFoundException(`Account with id ${tx.fromAccountId} not found`);
        if (from.status !== AccountStatus.ACTIVE) {
          throw new UnprocessableEntityException(`Account ${from.id} must be ACTIVE (current status: ${from.status})`);
        }
        from.balance = fromCents(toCents(from.balance) + cents);
        await manager.save(from);
      } else {
        if (!from) throw new NotFoundException(`Account with id ${tx.fromAccountId} not found`);
        if (!to) throw new NotFoundException(`Account with id ${tx.toAccountId} not found`);
        for (const acc of [from, to]) {
          if (acc.status !== AccountStatus.ACTIVE) {
            throw new UnprocessableEntityException(`Account ${acc.id} must be ACTIVE (current status: ${acc.status})`);
          }
        }
        const toBal = toCents(to.balance);
        if (toBal < cents) {
          throw new UnprocessableEntityException(
            `Insufficient funds on account ${to.id}: balance ${fromCents(toBal).toFixed(2)}, required ${fromCents(cents).toFixed(2)}`,
          );
        }
        to.balance = fromCents(toBal - cents);
        from.balance = fromCents(toCents(from.balance) + cents);
        await manager.save([from, to]);
      }
      tx.status = TransactionStatus.REVERSED;
      await manager.save(tx);
    });
    return loadItem(this.dataSource, id);
  }
}
