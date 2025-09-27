import { ApiProperty } from '@nestjs/swagger';

export class PlagiarismResultDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ required: false })
  wordCount?: number;

  @ApiProperty({ required: false })
  creditsUsed?: number;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  completedAt?: string;
}
