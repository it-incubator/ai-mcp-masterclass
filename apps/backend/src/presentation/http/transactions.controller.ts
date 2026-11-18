// Thin presentation layer: validate the HTTP input (DTO) -> build a Command/Query -> execute it on the bus -> return.
// No business rules here; they live in src/domain and src/application.
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApproveTransactionCommand } from '../../application/transactions/commands/approve-transaction/approve-transaction.command';
import { DepositCommand } from '../../application/transactions/commands/deposit/deposit.command';
import { RejectTransactionCommand } from '../../application/transactions/commands/reject-transaction/reject-transaction.command';
import { ReverseTransactionCommand } from '../../application/transactions/commands/reverse-transaction/reverse-transaction.command';
import { TransferCommand } from '../../application/transactions/commands/transfer/transfer.command';
import { WithdrawCommand } from '../../application/transactions/commands/withdraw/withdraw.command';
import { GetTransactionQuery } from '../../application/transactions/queries/get-transaction/get-transaction.query';
import { ListTransactionsQuery } from '../../application/transactions/queries/list-transactions/list-transactions.query';
import {
  DepositDto, ListTransactionsQueryDto, RejectTransactionDto, TransferDto, WithdrawDto,
} from './dto/transactions.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List transactions, newest first (filters, pagination)' })
  list(@Query() q: ListTransactionsQueryDto) {
    return this.queryBus.execute(new ListTransactionsQuery(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction (with account/customer names and risk levels)' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new GetTransactionQuery(id));
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit money to an ACTIVE account (completed immediately)' })
  deposit(@Body() dto: DepositDto) {
    return this.commandBus.execute(new DepositCommand(dto.accountId, dto.amount, dto.description));
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw money from an ACTIVE account with sufficient funds (completed immediately)' })
  withdraw(@Body() dto: WithdrawDto) {
    return this.commandBus.execute(new WithdrawCommand(dto.accountId, dto.amount, dto.description));
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer between two ACTIVE accounts of the same currency; amount >= 10000 is created PENDING (four-eyes)' })
  transfer(@Body() dto: TransferDto) {
    return this.commandBus.execute(new TransferCommand(dto.fromAccountId, dto.toAccountId, dto.amount, dto.description));
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a PENDING transfer: re-checks accounts/funds and moves the money' })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new ApproveTransactionCommand(id));
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a PENDING transaction (reason required); no money moves' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectTransactionDto) {
    return this.commandBus.execute(new RejectTransactionCommand(id, dto.reason));
  }

  @Post(':id/reverse')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reverse a COMPLETED transaction in place (inverse money movement, status REVERSED)' })
  reverse(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new ReverseTransactionCommand(id));
  }
}
