import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Amount to pay (in IDR)',
    minimum: 1000,
    maximum: 50000000, // 50 juta rupiah
    example: 12500,
  })
  @IsNumber()
  @Min(1000, { message: 'Minimum amount is Rp 1.000' })
  @Max(50000000, { message: 'Maximum amount is Rp 50.000.000' })
  amount: number;

  @ApiProperty({
    description: 'Assignment ID (if payment for assignment)',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignmentId?: string;
}
