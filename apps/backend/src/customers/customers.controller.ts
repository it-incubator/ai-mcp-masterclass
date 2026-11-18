// NOTE(masterclass): logic lives in the controller on purpose
import {
  Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Account, AccountStatus, Customer, KycStatus, RiskLevel, Transaction } from '../entities';
import {
  CreateCustomerDto, ListCustomersQueryDto, SetKycStatusDto, UpdateCustomerDto,
} from './customers.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'List customers (filters, pagination); items include accountsCount' })
  async list(@Query() q: ListCustomersQueryDto) {
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

  @Get(':id')
  @ApiOperation({ summary: 'Get customer with accounts' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    const customer = await this.dataSource.getRepository(Customer).findOne({
      where: { id },
      relations: { accounts: true },
      order: { accounts: { createdAt: 'ASC' } },
    });
    if (!customer) throw new NotFoundException(`Customer with id ${id} not found`);
    return customer;
  }

  @Post()
  @ApiOperation({ summary: 'Create customer (kycStatus PENDING, riskLevel defaults to LOW)' })
  async create(@Body() dto: CreateCustomerDto) {
    const repo = this.dataSource.getRepository(Customer);
    const existing = await repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException(`Customer with email ${dto.email} already exists`);
    const customer = repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      country: dto.country,
      kycStatus: KycStatus.PENDING,
      riskLevel: dto.riskLevel ?? RiskLevel.LOW,
    });
    try {
      return await repo.save(customer);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException(`Customer with email ${dto.email} already exists`);
      throw e;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer fields (partial)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    const repo = this.dataSource.getRepository(Customer);
    const customer = await repo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer with id ${id} not found`);
    if (dto.email !== undefined && dto.email !== customer.email) {
      const clash = await repo.findOne({ where: { email: dto.email } });
      if (clash) throw new ConflictException(`Customer with email ${dto.email} already exists`);
    }
    if (dto.firstName !== undefined) customer.firstName = dto.firstName;
    if (dto.lastName !== undefined) customer.lastName = dto.lastName;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.phone !== undefined) customer.phone = dto.phone;
    if (dto.country !== undefined) customer.country = dto.country;
    if (dto.riskLevel !== undefined) customer.riskLevel = dto.riskLevel;
    try {
      return await repo.save(customer);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException(`Customer with email ${dto.email} already exists`);
      throw e;
    }
  }

  @Post(':id/kyc')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set KYC status to VERIFIED or REJECTED' })
  async setKyc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetKycStatusDto) {
    const repo = this.dataSource.getRepository(Customer);
    const customer = await repo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer with id ${id} not found`);
    customer.kycStatus = dto.status;
    return repo.save(customer);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete customer (only if no ACTIVE/FROZEN accounts and no account has transactions)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!customer) throw new NotFoundException(`Customer with id ${id} not found`);

      const accounts = await manager.find(Account, { where: { customerId: id } });
      if (accounts.some((a) => a.status !== AccountStatus.CLOSED)) {
        throw new ConflictException('Customer has ACTIVE or FROZEN accounts and cannot be deleted');
      }
      if (accounts.length > 0) {
        const ids = accounts.map((a) => a.id);
        const txCount = await manager
          .getRepository(Transaction)
          .createQueryBuilder('t')
          .where('t."fromAccountId" IN (:...ids) OR t."toAccountId" IN (:...ids)', { ids })
          .getCount();
        if (txCount > 0) {
          throw new ConflictException('Customer has accounts with transactions and cannot be deleted');
        }
        await manager.delete(Account, ids);
      }
      await manager.delete(Customer, id);
    });
  }
}
