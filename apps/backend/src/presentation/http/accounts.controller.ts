// Thin presentation layer: validate the HTTP input (DTO) -> build a Command/Query -> execute it on the bus -> return.
// No business rules here; they live in src/domain and src/application.
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloseAccountCommand } from '../../application/accounts/commands/close-account/close-account.command';
import { FreezeAccountCommand } from '../../application/accounts/commands/freeze-account/freeze-account.command';
import { OpenAccountCommand } from '../../application/accounts/commands/open-account/open-account.command';
import { UnfreezeAccountCommand } from '../../application/accounts/commands/unfreeze-account/unfreeze-account.command';
import { GetAccountQuery } from '../../application/accounts/queries/get-account/get-account.query';
import { ListAccountsQuery } from '../../application/accounts/queries/list-accounts/list-accounts.query';
import { ListAccountsQueryDto, OpenAccountDto } from './dto/accounts.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List accounts (filters, pagination); items include customerName' })
  list(@Query() q: ListAccountsQueryDto) {
    return this.queryBus.execute(new ListAccountsQuery(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account with customer summary' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new GetAccountQuery(id));
  }

  @Post()
  @ApiOperation({ summary: 'Open an account (customer must be KYC VERIFIED); starts ACTIVE with balance 0' })
  open(@Body() dto: OpenAccountDto) {
    return this.commandBus.execute(new OpenAccountCommand(dto.customerId, dto.currency, dto.name));
  }

  @Post(':id/freeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Freeze an ACTIVE account' })
  freeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new FreezeAccountCommand(id));
  }

  @Post(':id/unfreeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unfreeze a FROZEN account' })
  unfreeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new UnfreezeAccountCommand(id));
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Close an account (zero balance, no PENDING transactions)' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new CloseAccountCommand(id));
  }
}
