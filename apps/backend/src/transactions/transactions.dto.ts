import { Transform, Type } from 'class-transformer';
import {
  IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { RiskLevel, TransactionStatus, TransactionType } from '../entities';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional() @IsEnum(TransactionType)
  type?: TransactionType;

  /** Matches transactions where the account is the source OR the destination */
  @IsOptional() @IsUUID()
  accountId?: string;

  /** Matches transactions where the customer owns the source OR the destination account */
  @IsOptional() @IsUUID()
  customerId?: string;

  /** Risk level of the owner of either side (source OR destination) */
  @IsOptional() @IsEnum(RiskLevel)
  customerRiskLevel?: RiskLevel;

  /** Risk level of the owner of the source account */
  @IsOptional() @IsEnum(RiskLevel)
  fromCustomerRiskLevel?: RiskLevel;

  @IsOptional() @Type(() => Number) @IsNumber()
  minAmount?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  maxAmount?: number;

  /** ISO 8601 date or datetime, inclusive */
  @IsOptional() @IsISO8601()
  dateFrom?: string;

  /** ISO 8601 date or datetime, inclusive (a plain date includes the whole day, UTC) */
  @IsOptional() @IsISO8601()
  dateTo?: string;
}

export class DepositDto {
  @IsUUID()
  accountId: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @IsPositive()
  @Max(1_000_000_000)
  amount: number;

  @IsOptional() @IsString() @MaxLength(500) @Transform(trim)
  description?: string;
}

export class WithdrawDto extends DepositDto {}

export class TransferDto {
  @IsUUID()
  fromAccountId: string;

  @IsUUID()
  toAccountId: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @IsPositive()
  @Max(1_000_000_000)
  amount: number;

  @IsOptional() @IsString() @MaxLength(500) @Transform(trim)
  description?: string;
}

export class RejectTransactionDto {
  @IsString() @IsNotEmpty() @MaxLength(500) @Transform(trim)
  reason: string;
}
