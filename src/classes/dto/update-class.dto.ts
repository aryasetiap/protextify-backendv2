import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateClassDto {
  @ApiProperty({
    required: false,
    description: 'The new name of the class',
    example: 'Kelas Kalkulus Lanjutan',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    required: false,
    description: 'The new description for the class',
    example: 'Kelas lanjutan untuk mata kuliah Kalkulus semester 3.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}