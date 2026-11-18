// Every use case handler (one folder = one use case). Registered in AppModule.
import { ApproveTransactionHandler } from './transactions/commands/approve-transaction/approve-transaction.handler';
import { CloseAccountHandler } from './accounts/commands/close-account/close-account.handler';
import { CreateCustomerHandler } from './customers/commands/create-customer/create-customer.handler';
import { DeleteCustomerHandler } from './customers/commands/delete-customer/delete-customer.handler';
import { DepositHandler } from './transactions/commands/deposit/deposit.handler';
import { FreezeAccountHandler } from './accounts/commands/freeze-account/freeze-account.handler';
import { GetAccountHandler } from './accounts/queries/get-account/get-account.handler';
import { GetCustomerHandler } from './customers/queries/get-customer/get-customer.handler';
import { GetSummaryReportHandler } from './reports/queries/get-summary-report/get-summary-report.handler';
import { GetTransactionHandler } from './transactions/queries/get-transaction/get-transaction.handler';
import { ListAccountsHandler } from './accounts/queries/list-accounts/list-accounts.handler';
import { ListCustomersHandler } from './customers/queries/list-customers/list-customers.handler';
import { ListTransactionsHandler } from './transactions/queries/list-transactions/list-transactions.handler';
import { OpenAccountHandler } from './accounts/commands/open-account/open-account.handler';
import { RejectTransactionHandler } from './transactions/commands/reject-transaction/reject-transaction.handler';
import { ReverseTransactionHandler } from './transactions/commands/reverse-transaction/reverse-transaction.handler';
import { SetKycStatusHandler } from './customers/commands/set-kyc-status/set-kyc-status.handler';
import { TransferHandler } from './transactions/commands/transfer/transfer.handler';
import { UnfreezeAccountHandler } from './accounts/commands/unfreeze-account/unfreeze-account.handler';
import { UpdateCustomerHandler } from './customers/commands/update-customer/update-customer.handler';
import { WithdrawHandler } from './transactions/commands/withdraw/withdraw.handler';

export const USE_CASE_HANDLERS = [
  ApproveTransactionHandler,
  CloseAccountHandler,
  CreateCustomerHandler,
  DeleteCustomerHandler,
  DepositHandler,
  FreezeAccountHandler,
  GetAccountHandler,
  GetCustomerHandler,
  GetSummaryReportHandler,
  GetTransactionHandler,
  ListAccountsHandler,
  ListCustomersHandler,
  ListTransactionsHandler,
  OpenAccountHandler,
  RejectTransactionHandler,
  ReverseTransactionHandler,
  SetKycStatusHandler,
  TransferHandler,
  UnfreezeAccountHandler,
  UpdateCustomerHandler,
  WithdrawHandler,
];
