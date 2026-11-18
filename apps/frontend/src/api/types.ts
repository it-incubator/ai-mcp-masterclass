export type Currency = 'USD' | 'EUR' | 'GBP';
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'REVERSED';

export const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP'];
export const KYC_STATUSES: KycStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];
export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
export const ACCOUNT_STATUSES: AccountStatus[] = ['ACTIVE', 'FROZEN', 'CLOSED'];
export const TRANSACTION_TYPES: TransactionType[] = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
export const TRANSACTION_STATUSES: TransactionStatus[] = ['PENDING', 'COMPLETED', 'REJECTED', 'REVERSED'];

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  country: string;
  kycStatus: KycStatus;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
  accountsCount?: number;
}

export interface Account {
  id: string;
  customerId: string;
  currency: Currency;
  balance: number;
  status: AccountStatus;
  name: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
}

export interface CustomerDetails extends Customer {
  accounts: Account[];
}

export interface AccountDetails extends Account {
  customer?: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'email'> & Partial<Customer>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  description?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  fromAccountName?: string | null;
  toAccountName?: string | null;
  fromCustomerName?: string | null;
  toCustomerName?: string | null;
  fromCustomerRiskLevel?: RiskLevel | null;
  toCustomerRiskLevel?: RiskLevel | null;
}

export type CurrencyMap = Record<Currency, number>;

export interface Summary {
  customersTotal: number;
  customersByKyc: Record<KycStatus, number>;
  accountsTotal: number;
  accountsByStatus: Record<AccountStatus, number>;
  totalBalanceByCurrency: CurrencyMap;
  pendingTransactions: number;
  pendingAmountByCurrency: CurrencyMap;
  volumeLast30Days: CurrencyMap;
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  riskLevel?: RiskLevel;
}

export interface CustomerFilters {
  search?: string;
  kycStatus?: KycStatus;
  riskLevel?: RiskLevel;
  country?: string;
  hasPendingTransactions?: boolean;
  page?: number;
  limit?: number;
}

export interface AccountFilters {
  customerId?: string;
  status?: AccountStatus;
  currency?: Currency;
  page?: number;
  limit?: number;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  type?: TransactionType;
  accountId?: string;
  customerId?: string;
  customerRiskLevel?: RiskLevel;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
