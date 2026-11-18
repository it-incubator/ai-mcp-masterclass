// MCP presentation layer for the accounts context: same Commands/Queries as the REST controller, no business logic.
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { CloseAccountCommand } from '../../application/accounts/commands/close-account/close-account.command';
import { FreezeAccountCommand } from '../../application/accounts/commands/freeze-account/freeze-account.command';
import { OpenAccountCommand } from '../../application/accounts/commands/open-account/open-account.command';
import { UnfreezeAccountCommand } from '../../application/accounts/commands/unfreeze-account/unfreeze-account.command';
import { GetAccountQuery } from '../../application/accounts/queries/get-account/get-account.query';
import { ListAccountsQuery } from '../../application/accounts/queries/list-accounts/list-accounts.query';
import { accountStatus, currency, limit, page, uuid } from './schemas';
import { runUseCase } from './tool-result';

const listAccounts = z.object({
  customerId: uuid('Only accounts of this customer').optional(),
  status: accountStatus.optional(),
  currency: currency.optional(),
  page,
  limit,
});
const openAccount = z.object({
  customerId: uuid('Customer who will own the account'),
  currency,
  name: z.string().trim().min(1).max(100).describe('Account display name, e.g. "Main EUR"'),
});
const accountId = z.object({ id: uuid('Account id') });

@Injectable()
export class AccountsTools {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Tool({
    name: 'list_accounts',
    description:
      'List accounts with optional filters (customerId, status, currency), sorted by customer name. Each item includes customerName and balance. '
      + 'Returns {items, total, page, limit}; default limit 10 (max 100).',
    parameters: listAccounts,
    annotations: { readOnlyHint: true },
  })
  listAccounts(args: z.infer<typeof listAccounts>) {
    return runUseCase(() => this.queryBus.execute(new ListAccountsQuery(args)));
  }

  @Tool({
    name: 'get_account',
    description: 'Get one account by id with a summary of its owner (name, email, KYC status, risk level).',
    parameters: accountId,
    annotations: { readOnlyHint: true },
  })
  getAccount({ id }: { id: string }) {
    return runUseCase(() => this.queryBus.execute(new GetAccountQuery(id)));
  }

  @Tool({
    name: 'open_account',
    description:
      'Open a new account (balance 0, status ACTIVE) for a customer. The customer must have KYC status VERIFIED, otherwise this fails '
      + '(use set_kyc_status first). Currency is USD, EUR or GBP.',
    parameters: openAccount,
  })
  openAccount(a: z.infer<typeof openAccount>) {
    return runUseCase(() => this.commandBus.execute(new OpenAccountCommand(a.customerId, a.currency, a.name)));
  }

  @Tool({
    name: 'freeze_account',
    description: 'Freeze an account. Only ACTIVE accounts can be frozen. A FROZEN account cannot take part in deposits, withdrawals or transfers.',
    parameters: accountId,
  })
  freezeAccount({ id }: { id: string }) {
    return runUseCase(() => this.commandBus.execute(new FreezeAccountCommand(id)));
  }

  @Tool({
    name: 'unfreeze_account',
    description: 'Unfreeze an account back to ACTIVE. Only FROZEN accounts can be unfrozen.',
    parameters: accountId,
  })
  unfreezeAccount({ id }: { id: string }) {
    return runUseCase(() => this.commandBus.execute(new UnfreezeAccountCommand(id)));
  }

  @Tool({
    name: 'close_account',
    description:
      'Close an account permanently. Allowed only when the balance is exactly 0, the account is not already CLOSED and it has no PENDING '
      + 'transactions. Closing cannot be undone: confirm with the user first.',
    parameters: accountId,
    annotations: { destructiveHint: true },
  })
  closeAccount({ id }: { id: string }) {
    return runUseCase(() => this.commandBus.execute(new CloseAccountCommand(id)));
  }
}
