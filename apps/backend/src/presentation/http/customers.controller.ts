// Thin presentation layer: validate the HTTP input (DTO) -> build a Command/Query -> execute it on the bus -> return.
// No business rules here; they live in src/domain and src/application.
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCustomerCommand } from '../../application/customers/commands/create-customer/create-customer.command';
import { DeleteCustomerCommand } from '../../application/customers/commands/delete-customer/delete-customer.command';
import { SetKycStatusCommand } from '../../application/customers/commands/set-kyc-status/set-kyc-status.command';
import { UpdateCustomerCommand } from '../../application/customers/commands/update-customer/update-customer.command';
import { GetCustomerQuery } from '../../application/customers/queries/get-customer/get-customer.query';
import { ListCustomersQuery } from '../../application/customers/queries/list-customers/list-customers.query';
import { CreateCustomerDto, ListCustomersQueryDto, SetKycStatusDto, UpdateCustomerDto } from './dto/customers.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List customers (filters, pagination); items include accountsCount' })
  list(@Query() q: ListCustomersQueryDto) {
    return this.queryBus.execute(new ListCustomersQuery(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer with accounts' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new GetCustomerQuery(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create customer (kycStatus PENDING, riskLevel defaults to LOW)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.commandBus.execute(
      new CreateCustomerCommand(dto.firstName, dto.lastName, dto.email, dto.country, dto.phone, dto.riskLevel),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer fields (partial)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.commandBus.execute(
      new UpdateCustomerCommand(id, dto.firstName, dto.lastName, dto.email, dto.phone, dto.country, dto.riskLevel),
    );
  }

  @Post(':id/kyc')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set KYC status to VERIFIED or REJECTED' })
  setKyc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetKycStatusDto) {
    return this.commandBus.execute(new SetKycStatusCommand(id, dto.status));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete customer (only if no ACTIVE/FROZEN accounts and no account has transactions)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteCustomerCommand(id));
  }
}
