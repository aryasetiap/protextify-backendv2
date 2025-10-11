import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
} from 'class-validator';

export class BulkDownloadDto {
  @ApiProperty({
    description: 'An array of submission IDs to download',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  submissionIds: string[];

  @ApiProperty({
    description: 'The desired export format',
    enum: ['zip', 'csv'],
    example: 'zip',
  })
  @IsString()
  @IsIn(['zip', 'csv'])
  format: 'zip' | 'csv';
}
