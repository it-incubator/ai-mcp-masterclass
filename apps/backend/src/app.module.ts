import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { USE_CASE_HANDLERS } from './application';
import { DevController } from './infrastructure/dev/dev.controller';
import { HealthController } from './infrastructure/health/health.controller';
import { Account, Customer, Transaction } from './infrastructure/persistence/entities';
import { MCP_TOOLS } from './presentation/mcp';
import { AccountsController } from './presentation/http/accounts.controller';
import { CustomersController } from './presentation/http/customers.controller';
import { DomainExceptionFilter } from './presentation/http/domain-exception.filter';
import { ReportsController } from './presentation/http/reports.controller';
import { TransactionsController } from './presentation/http/transactions.controller';

@Module({
  imports: [
    CqrsModule.forRoot(),
    // Second presentation layer: MCP tools over Streamable HTTP at /mcp (excluded from the `api` prefix in main.ts).
    McpModule.forRoot({
      name: 'ledger-admin',
      version: '1.0.0',
      instructions:
        'Ledger Admin back-office: customers, accounts, transactions. Transfers >= 10 000 are created PENDING (four-eyes) '
        + 'and need approve_transaction / reject_transaction. List tools default to 10 rows; use filters, page and limit.',
      transport: McpTransportType.STREAMABLE_HTTP,
      mcpEndpoint: 'mcp',
      streamableHttp: { enableJsonResponse: true, statelessMode: true, sessionIdGenerator: undefined },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USER ?? 'ledger',
      password: process.env.DB_PASSWORD ?? 'ledger',
      database: process.env.DB_NAME ?? 'ledger',
      entities: [Customer, Account, Transaction],
      synchronize: true, // demo only!
      retryAttempts: 30, // DB may still be starting
      retryDelay: 2000,
    }),
  ],
  controllers: [
    CustomersController,
    AccountsController,
    TransactionsController,
    ReportsController,
    DevController,
    HealthController,
  ],
  providers: [...USE_CASE_HANDLERS, ...MCP_TOOLS, { provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
