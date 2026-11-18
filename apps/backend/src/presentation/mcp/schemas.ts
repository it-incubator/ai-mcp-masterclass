// Shared zod building blocks for tool inputs (presentation concern: LLM-facing validation + docs).
import { z } from 'zod';
import { AccountStatus, Currency, KycStatus, RiskLevel, TransactionStatus, TransactionType } from '../../domain/enums';

export const uuid = (what: string) => z.uuid().describe(`${what} (UUID)`);

export const currency = z.enum(Currency).describe('Currency: USD, EUR or GBP');
export const kycStatus = z.enum(KycStatus).describe('KYC status: PENDING, VERIFIED or REJECTED');
export const riskLevel = z.enum(RiskLevel).describe('Customer risk level: LOW, MEDIUM or HIGH');
export const accountStatus = z.enum(AccountStatus).describe('Account status: ACTIVE, FROZEN or CLOSED');
export const transactionStatus = z.enum(TransactionStatus).describe('Transaction status: PENDING, COMPLETED, REJECTED or REVERSED');
export const transactionType = z.enum(TransactionType).describe('Transaction type: DEPOSIT, WITHDRAWAL or TRANSFER');

/** Lists default to 10 rows (keeps LLM context small); raise `limit` (max 100) or increase `page` for more. */
export const page = z.number().int().min(1).default(1).describe('Page number, starting from 1 (default 1)');
export const limit = z.number().int().min(1).max(100).default(10).describe('Page size, 1..100 (default 10)');

/** Money amount: > 0, at most 2 decimals. */
export const amount = z
  .number()
  .positive()
  .max(1_000_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'amount must have at most 2 decimal places')
  .describe('Amount in the account currency, greater than 0, at most 2 decimal places');

export const description = z.string().trim().max(500).optional().describe('Optional free-text description (max 500 chars)');
