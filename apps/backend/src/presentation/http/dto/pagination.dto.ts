import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  /** Page number, starting from 1 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Page size, 1..100 (default 20) */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
