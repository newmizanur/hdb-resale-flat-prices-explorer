import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const SORTABLE_FIELDS = [
  'month',
  'town',
  'flatType',
  'resalePrice',
  'remainingLeaseMonths',
  'floorAreaSqm',
] as const;

const SORT_OPTIONS = SORTABLE_FIELDS.flatMap((field) => [`${field}:asc`, `${field}:desc`]);

export class QueryTransactionsDto {
  @IsOptional()
  @IsString({ message: 'town must be a string' })
  town?: string;

  @IsOptional()
  @IsString({ message: 'flatType must be a string' })
  flatType?: string;

  @IsOptional()
  @IsString({ message: 'storeyRange must be a string' })
  storeyRange?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPrice must be a number' })
  @Min(0, { message: 'minPrice must not be negative' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice must be a number' })
  @Min(0, { message: 'maxPrice must not be negative' })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minLeaseMonths must be an integer' })
  @Min(0, { message: 'minLeaseMonths must not be negative' })
  minLeaseMonths?: number;

  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS, {
    message: `sort must be one of: ${SORT_OPTIONS.join(', ')}`,
  })
  sort?: string = 'month:desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit: number = 20;
}
