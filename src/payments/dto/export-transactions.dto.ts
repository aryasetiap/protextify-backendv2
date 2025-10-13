import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class ExportTransactionsDto {
  @ApiProperty({
    required: false,
    description: 'Filter by transaction status',
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsString()
  @IsIn(['SUCCESS', 'FAILED', 'PENDING'])
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Start date for the filter range (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for the filter range (YYYY-MM-DD)',
    example: '2025-03-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Search term to filter by assignment or class name',
    example: 'Kalkulus',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
