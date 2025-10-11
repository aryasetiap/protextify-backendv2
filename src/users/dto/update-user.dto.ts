import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @ApiProperty({
    required: false,
    description: 'User phone number',
    example: '+6281234567890',
  })
  @IsOptional()
  @IsPhoneNumber() // Validasi nomor telepon internasional
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'User biography',
    example: 'Dosen senior dengan fokus pada AI.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    required: false,
    description: 'URL for the user avatar image',
    example: 'https://storage.protextify.com/avatars/user-123.png',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
