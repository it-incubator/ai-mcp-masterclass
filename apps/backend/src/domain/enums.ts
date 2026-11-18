// Domain vocabulary shared by every layer (persistence, application, presentation).
export enum Currency { USD = 'USD', EUR = 'EUR', GBP = 'GBP' }
export enum AccountStatus { ACTIVE = 'ACTIVE', FROZEN = 'FROZEN', CLOSED = 'CLOSED' }
export enum KycStatus { PENDING = 'PENDING', VERIFIED = 'VERIFIED', REJECTED = 'REJECTED' }
export enum RiskLevel { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH' }
export enum TransactionType { DEPOSIT = 'DEPOSIT', WITHDRAWAL = 'WITHDRAWAL', TRANSFER = 'TRANSFER' }
export enum TransactionStatus { PENDING = 'PENDING', COMPLETED = 'COMPLETED', REJECTED = 'REJECTED', REVERSED = 'REVERSED' }
