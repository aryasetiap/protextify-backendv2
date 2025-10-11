import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GradeDto {
  @ApiProperty({
    description: 'The ID of the submission to grade',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  submissionId: string;

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
    example: 'Kerja bagus, analisisnya mendalam.',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class BulkGradeDto {
  @ApiProperty({
    type: [GradeDto],
    description: 'An array of submissions to grade',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeDto)
  grades: GradeDto[];
}
