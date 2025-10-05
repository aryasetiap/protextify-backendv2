import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class NotificationDto {
  @IsString()
  @IsIn([
    // Basic types
    'success',
    'error',
    'info',
    'warning',
    // Payment types
    'payment_success',
    'payment_failed',
    // Plagiarism types
    'plagiarism_completed',
    'plagiarism_failed',
    // File/Storage types
    'file_ready',
    'file_uploaded',
    // Submission types
    'grade_received',
  ])
  type:
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'payment_success'
    | 'payment_failed'
    | 'plagiarism_completed'
    | 'plagiarism_failed'
    | 'file_ready'
    | 'file_uploaded'
    | 'grade_received';

  @IsString()
  message: string;

  @IsOptional()
  data?: any;

  @IsDateString()
  createdAt: string;
}
