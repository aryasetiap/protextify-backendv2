import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendVerificationDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
