import { IsString, IsOptional, IsDateString } from 'class-validator';

export class NotificationDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsOptional()
  data?: any;

  @IsDateString()
  createdAt: string;
}
