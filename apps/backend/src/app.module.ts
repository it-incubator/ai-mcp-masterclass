import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsController } from './accounts/accounts.controller';
import { CustomersController } from './customers/customers.controller';
import { DevController } from './dev/dev.controller';
import { Account, Customer, Transaction } from './entities';
import { HealthController } from './health/health.controller';
import { ReportsController } from './reports/reports.controller';
import { TransactionsController } from './transactions/transactions.controller';

@Module({
  imports: [
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
})
export class AppModule {}
