import { RiskLevel, TransactionStatus, TransactionType } from '../../../../domain/enums';

export class ListTransactionsQuery {
  readonly status?: TransactionStatus;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly customerId?: string;
  readonly customerRiskLevel?: RiskLevel;
  readonly fromCustomerRiskLevel?: RiskLevel;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly limit: number;

  constructor(init: {
    status?: TransactionStatus; type?: TransactionType; accountId?: string; customerId?: string;
    customerRiskLevel?: RiskLevel; fromCustomerRiskLevel?: RiskLevel; minAmount?: number; maxAmount?: number;
    dateFrom?: string; dateTo?: string; page: number; limit: number;
  }) {
    Object.assign(this, init);
  }
}
