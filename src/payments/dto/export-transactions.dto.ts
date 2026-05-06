import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

/** Kosongkan string date dari FE supaya @IsOptional benar-benar mengabaikan field */
function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export class ExportTransactionsDto {
  @ApiProperty({
    required: false,
    description: 'Filter by transaction status',
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    example: 'SUCCESS',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @IsIn(['SUCCESS', 'FAILED', 'PENDING'])
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Start date for the filter range (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for the filter range (YYYY-MM-DD)',
    example: '2025-03-31',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Search term to filter by assignment or class name',
    example: 'Kalkulus',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  search?: string;
}
