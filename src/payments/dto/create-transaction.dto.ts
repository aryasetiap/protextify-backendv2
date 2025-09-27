import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  credits?: number;
}
