import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateContentDto {
  @ApiProperty({
    description: 'Updated content for the submission',
    example: 'Konten baru tugas...',
  })
  @IsString()
  content: string;
}
