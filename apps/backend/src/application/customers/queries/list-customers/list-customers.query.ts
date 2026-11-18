import { KycStatus, RiskLevel } from '../../../../domain/enums';

export class ListCustomersQuery {
  readonly search?: string;
  readonly kycStatus?: KycStatus;
  readonly riskLevel?: RiskLevel;
  readonly country?: string;
  readonly hasPendingTransactions?: boolean;
  readonly page: number;
  readonly limit: number;

  constructor(init: {
    search?: string; kycStatus?: KycStatus; riskLevel?: RiskLevel; country?: string;
    hasPendingTransactions?: boolean; page: number; limit: number;
  }) {
    Object.assign(this, init);
  }
}
