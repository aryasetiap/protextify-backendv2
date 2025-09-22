import { IsString, IsDateString } from 'class-validator';

export class UpdateContentDto {
  @IsString()
  submissionId: string;

  @IsString()
  content: string;

  @IsDateString()
  updatedAt: string;
}
