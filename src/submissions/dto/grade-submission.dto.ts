import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({
    description: 'The grade for the submission (0-100)',
    example: 90,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  grade: number;

  @ApiProperty({
    required: false,
    description: 'Optional feedback for the student',
    example:
      'Analisis sudah baik, namun perlu diperdalam pada bagian kesimpulan.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
