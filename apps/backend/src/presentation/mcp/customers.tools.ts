// MCP presentation layer for the customers context: each tool maps its input to the SAME Command/Query
// the REST controller uses and executes it on the bus. No business logic here.
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { CreateCustomerCommand } from '../../application/customers/commands/create-customer/create-customer.command';
import { DeleteCustomerCommand } from '../../application/customers/commands/delete-customer/delete-customer.command';
import { SetKycStatusCommand } from '../../application/customers/commands/set-kyc-status/set-kyc-status.command';
import { UpdateCustomerCommand } from '../../application/customers/commands/update-customer/update-customer.command';
import { GetCustomerQuery } from '../../application/customers/queries/get-customer/get-customer.query';
import { ListCustomersQuery } from '../../application/customers/queries/list-customers/list-customers.query';
import { KycStatus } from '../../domain/enums';
import { kycStatus, limit, page, riskLevel, uuid } from './schemas';
import { runUseCase } from './tool-result';

const listCustomers = z.object({
  search: z.string().trim().optional().describe('Case-insensitive match on first name, last name, full name or email'),
  kycStatus: kycStatus.optional(),
  riskLevel: riskLevel.optional(),
  country: z.string().trim().toUpperCase().optional().describe('ISO 3166-1 alpha-2 country code, e.g. DE'),
  hasPendingTransactions: z.boolean().optional()
    .describe('true = only customers who own an account involved in a PENDING transaction (awaiting four-eyes approval)'),
  page,
  limit,
});
const createCustomer = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email().max(255).toLowerCase().describe('Unique email; creating a duplicate fails with a conflict error'),
  country: z.string().trim().toUpperCase().length(2).describe('ISO 3166-1 alpha-2 country code, e.g. DE'),
  phone: z.string().trim().max(50).optional(),
  riskLevel: riskLevel.optional().describe('Risk level, defaults to LOW'),
});
const updateCustomer = z.object({
  id: uuid('Customer id'),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(255).toLowerCase().optional(),
  phone: z.string().trim().max(50).optional(),
  country: z.string().trim().toUpperCase().length(2).optional().describe('ISO 3166-1 alpha-2 country code'),
  riskLevel: riskLevel.optional(),
});

@Injectable()
export class CustomersTools {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Tool({
    name: 'list_customers',
    description:
      'List customers with optional filters, sorted by last name. Each item has accountsCount. Returns {items, total, page, limit}; '
      + 'default limit is 10 (max 100), use page to get more. Use hasPendingTransactions=true with riskLevel=HIGH to find risky customers '
      + 'who have transfers waiting for approval.',
    parameters: listCustomers,
    annotations: { readOnlyHint: true },
  })
  listCustomers(args: z.infer<typeof listCustomers>) {
    return runUseCase(() => this.queryBus.execute(new ListCustomersQuery(args)));
  }

  @Tool({
    name: 'get_customer',
    description: 'Get one customer by id, including the list of their accounts (id, name, currency, balance, status).',
    parameters: z.object({ id: uuid('Customer id') }),
    annotations: { readOnlyHint: true },
  })
  getCustomer({ id }: { id: string }) {
    return runUseCase(() => this.queryBus.execute(new GetCustomerQuery(id)));
  }

  @Tool({
    name: 'create_customer',
    description:
      'Create a customer. kycStatus always starts as PENDING (use set_kyc_status to verify), riskLevel defaults to LOW. '
      + 'Email must be unique (conflict error otherwise).',
    parameters: createCustomer,
  })
  createCustomer(a: z.infer<typeof createCustomer>) {
    return runUseCase(() =>
      this.commandBus.execute(new CreateCustomerCommand(a.firstName, a.lastName, a.email, a.country, a.phone, a.riskLevel)));
  }

  @Tool({
    name: 'update_customer',
    description: 'Partially update a customer: only the fields you pass are changed. Changing email to one already in use fails with a conflict error.',
    parameters: updateCustomer,
    annotations: { idempotentHint: true },
  })
  updateCustomer(a: z.infer<typeof updateCustomer>) {
    return runUseCase(() =>
      this.commandBus.execute(new UpdateCustomerCommand(a.id, a.firstName, a.lastName, a.email, a.phone, a.country, a.riskLevel)));
  }

  @Tool({
    name: 'set_kyc_status',
    description:
      'Set a customer KYC status to VERIFIED or REJECTED. Accounts can be opened only for VERIFIED customers.',
    parameters: z.object({
      id: uuid('Customer id'),
      status: z.enum([KycStatus.VERIFIED, KycStatus.REJECTED]).describe('New KYC status: VERIFIED or REJECTED'),
    }),
    annotations: { idempotentHint: true },
  })
  setKycStatus({ id, status }: { id: string; status: KycStatus.VERIFIED | KycStatus.REJECTED }) {
    return runUseCase(() => this.commandBus.execute(new SetKycStatusCommand(id, status)));
  }

  @Tool({
    name: 'delete_customer',
    description:
      'Permanently delete a customer. Allowed only if the customer has no ACTIVE or FROZEN accounts and none of their accounts has any '
      + 'transactions (their CLOSED accounts are deleted with them). Otherwise returns a conflict error. Destructive: confirm with the user first.',
    parameters: z.object({ id: uuid('Customer id') }),
    annotations: { destructiveHint: true },
  })
  deleteCustomer({ id }: { id: string }) {
    return runUseCase(async () => {
      await this.commandBus.execute(new DeleteCustomerCommand(id));
      return { ok: true, deleted: id };
    });
  }
}
