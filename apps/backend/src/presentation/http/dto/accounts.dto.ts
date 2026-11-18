import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { AccountStatus, Currency } from '../../../domain/enums';

export class ListAccountsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID()
  customerId?: string;

  @IsOptional() @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional() @IsEnum(Currency)
  currency?: Currency;
}

export class OpenAccountDto {
  @IsUUID()
  customerId: string;

  @IsEnum(Currency)
  currency: Currency;

  @IsString() @IsNotEmpty() @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;
}
