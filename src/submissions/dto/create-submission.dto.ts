import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty()
  @IsString()
  content: string;
}
