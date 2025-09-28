import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsOptional } from 'class-validator';

export class DownloadSubmissionDto {
  @ApiProperty({
    description: 'File format to download',
    enum: ['pdf', 'docx'],
    default: 'pdf',
  })
  @IsString()
  @IsIn(['pdf', 'docx'])
  format: 'pdf' | 'docx' = 'pdf';

  @ApiProperty({
    description: 'Include detailed plagiarism results (instructor only)',
    required: false,
    default: false,
  })
  @IsOptional()
  includeDetails?: boolean = false;
}

export class DownloadResponseDto {
  @ApiProperty({ description: 'Generated filename' })
  filename: string;

  @ApiProperty({ description: 'Download URL' })
  url: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'File format' })
  format: 'pdf' | 'docx';

  @ApiProperty({ description: 'Generation timestamp' })
  generatedAt: string;
}
