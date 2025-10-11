import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAnalyticsDto {
  @ApiProperty({
    required: false,
    description: "Date range for analytics (default: '7d')",
    enum: ['7d', '30d', '90d'],
    example: '30d',
  })
  @IsOptional()
  @IsString()
  @IsIn(['7d', '30d', '90d'])
  range?: string = '7d';
}
