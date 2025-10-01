import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    description: 'Assignment ID (if file is for assignment)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({
    description: 'Submission ID (if file is attachment to submission)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiProperty({
    description: 'File description or notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UploadResponseDto {
  @ApiProperty({ description: 'Uploaded file ID' })
  id: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'Cloud storage key' })
  cloudKey: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: string;
}
