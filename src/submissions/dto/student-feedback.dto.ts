import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class StudentFeedbackDto {
  @ApiProperty({
    description: 'Array of feedback scores for 5 questions (each 1-10)',
    example: [8, 7, 9, 6, 10],
    minItems: 5,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10, { each: true })
  answers: number[];
}
