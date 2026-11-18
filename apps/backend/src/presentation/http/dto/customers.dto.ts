import { Transform } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsEnum, IsIn, IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { KycStatus, RiskLevel } from '../../../domain/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class ListCustomersQueryDto extends PaginationQueryDto {
  /** Matches first name, last name, full name or email (case-insensitive) */
  @IsOptional() @IsString() @Transform(trim)
  search?: string;

  @IsOptional() @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @IsOptional() @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional() @IsString() @Transform(upper)
  country?: string;

  /** true = only customers owning an account involved in a PENDING transaction; false/omitted = no filter */
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  hasPendingTransactions?: boolean;
}

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() @MaxLength(100) @Transform(trim)
  firstName: string;

  @IsString() @IsNotEmpty() @MaxLength(100) @Transform(trim)
  lastName: string;

  @IsEmail() @MaxLength(255) @Transform(lower)
  email: string;

  @IsOptional() @IsString() @MaxLength(50) @Transform(trim)
  phone?: string;

  /** ISO 3166-1 alpha-2 country code */
  @IsISO31661Alpha2() @Transform(upper)
  country: string;

  @IsOptional() @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) @Transform(trim)
  firstName?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) @Transform(trim)
  lastName?: string;

  @IsOptional() @IsEmail() @MaxLength(255) @Transform(lower)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50) @Transform(trim)
  phone?: string;

  @IsOptional() @IsISO31661Alpha2() @Transform(upper)
  country?: string;

  @IsOptional() @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;
}

export class SetKycStatusDto {
  @IsIn([KycStatus.VERIFIED, KycStatus.REJECTED], { message: 'status must be one of the following values: VERIFIED, REJECTED' })
  status: KycStatus.VERIFIED | KycStatus.REJECTED;
}

