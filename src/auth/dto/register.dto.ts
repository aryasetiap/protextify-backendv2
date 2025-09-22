import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ enum: ['INSTRUCTOR', 'STUDENT'] })
  @IsEnum(['INSTRUCTOR', 'STUDENT'])
  role: 'INSTRUCTOR' | 'STUDENT';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  institution?: string;
}
