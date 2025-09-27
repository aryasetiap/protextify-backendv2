import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class WebhookDto {
  @ApiProperty()
  @IsString()
  order_id: string;

  @ApiProperty()
  @IsString()
  transaction_status: string;

  @ApiProperty()
  @IsString()
  signature_key: string;

  @ApiProperty() // 🔧 Ubah menjadi required
  @IsString()
  status_code: string; // 🔧 Hapus optional, buat required

  @ApiProperty() // 🔧 Ubah menjadi required
  @IsString()
  gross_amount: string; // 🔧 Hapus optional, buat required

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fraud_status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payment_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transaction_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
