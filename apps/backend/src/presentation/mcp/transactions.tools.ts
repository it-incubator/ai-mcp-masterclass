// MCP presentation layer for the transactions context: same Commands/Queries as the REST controller, no business logic.
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { ApproveTransactionCommand } from '../../application/transactions/commands/approve-transaction/approve-transaction.command';
import { DepositCommand } from '../../application/transactions/commands/deposit/deposit.command';
import { RejectTransactionCommand } from '../../application/transactions/commands/reject-transaction/reject-transaction.command';
import { ReverseTransactionCommand } from '../../application/transactions/commands/reverse-transaction/reverse-transaction.command';
import { TransferCommand } from '../../application/transactions/commands/transfer/transfer.command';
import { WithdrawCommand } from '../../application/transactions/commands/withdraw/withdraw.command';
import { GetTransactionQuery } from '../../application/transactions/queries/get-transaction/get-transaction.query';
import { ListTransactionsQuery } from '../../application/transactions/queries/list-transactions/list-transactions.query';
import { amount, description, limit, page, riskLevel, transactionStatus, transactionType, uuid } from './schemas';
import { runUseCase } from './tool-result';

const isoDate = (what: string) => z.iso.datetime({ offset: true }).or(z.iso.date()).describe(what);

const listTransactions = z.object({
  status: transactionStatus.optional(),
  type: transactionType.optional(),
  accountId: uuid('Transactions where this account is the source OR the destination').optional(),
  customerId: uuid('Transactions where this customer owns the source OR the destination account').optional(),
  customerRiskLevel: riskLevel.optional().describe('Risk level of the owner of either side: LOW, MEDIUM or HIGH'),
  fromCustomerRiskLevel: riskLevel.optional().describe('Risk level of the owner of the SOURCE account: LOW, MEDIUM or HIGH'),
  minAmount: z.number().optional().describe('Minimum amount (inclusive)'),
  maxAmount: z.number().optional().describe('Maximum amount (inclusive)'),
  dateFrom: isoDate('Created at or after this ISO 8601 date/datetime, e.g. 2026-01-31').optional(),
  dateTo: isoDate('Created at or before this ISO 8601 date/datetime; a plain date includes the whole day (UTC)').optional(),
  page,
  limit,
});
const deposit = z.object({ accountId: uuid('Account to credit'), amount, description });
const withdraw = z.object({ accountId: uuid('Account to debit'), amount, description });
const transfer = z.object({
  fromAccountId: uuid('Source account (debited)'),
  toAccountId: uuid('Destination account (credited); must differ from the source'),
  amount,
  description,
});
const transactionId = z.object({ id: uuid('Transaction id') });

@Injectable()
export class TransactionsTools {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Tool({
    name: 'list_transactions',
    description:
      'List transactions, newest first, with optional filters. Items include fromAccountName, toAccountName, fromCustomerName, toCustomerName and '
      + 'both customers\' risk levels. Use status=PENDING to see the four-eyes approval queue (transfers >= 10 000 await approve/reject). '
      + 'Returns {items, total, page, limit}; default limit 10 (max 100).',
    parameters: listTransactions,
    annotations: { readOnlyHint: true },
  })
  listTransactions(args: z.infer<typeof listTransactions>) {
    return runUseCase(() => this.queryBus.execute(new ListTransactionsQuery(args)));
  }

  @Tool({
    name: 'get_transaction',
    description: 'Get one transaction by id (with account/customer names and risk levels, rejection reason if rejected).',
    parameters: transactionId,
    annotations: { readOnlyHint: true },
  })
  getTransaction({ id }: { id: string }) {
    return runUseCase(() => this.queryBus.execute(new GetTransactionQuery(id)));
  }

  @Tool({
    name: 'deposit',
    description:
      'Deposit money into an account; completed immediately, in the account currency. The account must be ACTIVE. '
      + 'Amount > 0 with at most 2 decimals.',
    parameters: deposit,
  })
  deposit(a: z.infer<typeof deposit>) {
    return runUseCase(() => this.commandBus.execute(new DepositCommand(a.accountId, a.amount, a.description)));
  }

  @Tool({
    name: 'withdraw',
    description:
      'Withdraw money from an account; completed immediately. The account must be ACTIVE and have sufficient funds '
      + '(otherwise an error explains balance vs required).',
    parameters: withdraw,
  })
  withdraw(a: z.infer<typeof withdraw>) {
    return runUseCase(() => this.commandBus.execute(new WithdrawCommand(a.accountId, a.amount, a.description)));
  }

  @Tool({
    name: 'transfer',
    description:
      'Transfer money between two different ACTIVE accounts of the SAME currency with sufficient funds on the source. '
      + 'FOUR-EYES RULE: a transfer of 10 000 or more is created with status PENDING and NO money moves until someone calls '
      + 'approve_transaction (or reject_transaction). Smaller transfers complete immediately. Check the returned status.',
    parameters: transfer,
  })
  transfer(a: z.infer<typeof transfer>) {
    return runUseCase(() => this.commandBus.execute(new TransferCommand(a.fromAccountId, a.toAccountId, a.amount, a.description)));
  }

  @Tool({
    name: 'approve_transaction',
    description:
      'Approve a PENDING transfer (four-eyes queue): re-checks that both accounts are ACTIVE and funds are sufficient, moves the money and '
      + 'sets status COMPLETED. Only PENDING transactions can be approved; if a check fails the error is returned and the transaction stays PENDING. '
      + 'Moves real money: confirm with the user before bulk approvals.',
    parameters: transactionId,
  })
  approveTransaction({ id }: { id: string }) {
    return runUseCase(() => this.commandBus.execute(new ApproveTransactionCommand(id)));
  }

  @Tool({
    name: 'reject_transaction',
    description:
      'Reject a PENDING transaction with a mandatory reason (stored as rejectionReason). No money moves; status becomes REJECTED. '
      + 'Only PENDING transactions can be rejected.',
    parameters: z.object({ id: uuid('Transaction id'), reason: z.string().trim().min(1).max(500).describe('Why it is rejected (required, max 500 chars)') }),
  })
  rejectTransaction({ id, reason }: { id: string; reason: string }) {
    return runUseCase(() => this.commandBus.execute(new RejectTransactionCommand(id, reason)));
  }

  @Tool({
    name: 'reverse_transaction',
    description:
      'Reverse a COMPLETED transaction in place (no new row): performs the inverse money movement and sets status REVERSED. '
      + 'Fails if the transaction is not COMPLETED, if the involved accounts are not ACTIVE, or if the account that would be debited lacks funds '
      + '(e.g. reversing a deposit whose money was already spent).',
    parameters: transactionId,
    annotations: { destructiveHint: true },
  })
  reverseTransaction({ id }: { id: string }) {
    return runUseCase(() => this.commandBus.execute(new ReverseTransactionCommand(id)));
  }
}
