import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class CheckPlagiarismDto {
  @ApiProperty({
    description: 'Array of sources to exclude from plagiarism check',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded_sources?: string[];

  @ApiProperty({
    description: 'Language code (2 letters)',
    required: false,
    default: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Country code where text was written',
    required: false,
    default: 'us',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
