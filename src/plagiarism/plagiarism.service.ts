import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
// 🔧 Perbaiki import DTO menggunakan index
import { CheckPlagiarismDto, PlagiarismResultDto } from './dto';
import { PlagiarismJobData } from './interfaces/winston-ai.interface';

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue('plagiarism') private readonly plagiarismQueue: Queue,
  ) {}

  async checkPlagiarism(
    submissionId: string,
    dto: CheckPlagiarismDto,
    instructorId: string,
  ): Promise<PlagiarismResultDto> {
    this.logger.log(
      `[PLAGIARISM SERVICE] Starting plagiarism check for submission: ${submissionId}`,
    );

    // Validate submission and permissions
    const submission = await this.prismaService.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: true },
        },
        student: true,
        plagiarismChecks: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.assignment.class.instructorId !== instructorId) {
      throw new ForbiddenException('Not your class');
    }

    if (!submission.content || submission.content.trim().length === 0) {
      throw new BadRequestException('Submission content is empty');
    }

    if (submission.content.length < 100) {
      throw new BadRequestException(
        'Submission content must be at least 100 characters',
      );
    }

    if (submission.content.length > 120000) {
      throw new BadRequestException(
        'Submission content exceeds maximum length (120,000 characters)',
      );
    }

    // Check if there's already a pending job for this submission
    const existingJobs = await this.plagiarismQueue.getJobs([
      'waiting',
      'active',
    ]);
    const pendingJob = existingJobs.find(
      (job) => job.data.submissionId === submissionId,
    );

    if (pendingJob) {
      this.logger.log(
        `[PLAGIARISM SERVICE] Found existing job for submission: ${submissionId}`,
      );
      return {
        jobId: pendingJob.id.toString(),
        status: await this.getJobStatus(pendingJob),
        message: 'Plagiarism check is already in progress',
      };
    }

    // Update plagiarism check status to processing
    await this.prismaService.plagiarismCheck.upsert({
      where: { submissionId },
      update: {
        status: 'processing',
        checkedAt: new Date(),
      },
      create: {
        submissionId,
        score: 0,
        status: 'processing',
        wordCount: 0,
        creditsUsed: 0,
        rawResponse: undefined,
      },
    });

    // Prepare job data
    const jobData: PlagiarismJobData = {
      submissionId,
      content: submission.content,
      instructorId,
      studentId: submission.studentId,
    };

    // Add job to queue
    const job = await this.plagiarismQueue.add('check-plagiarism', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 10, // Keep last 10 completed jobs
      removeOnFail: 10, // Keep last 10 failed jobs
    });

    this.logger.log(
      `[PLAGIARISM SERVICE] Added plagiarism job to queue: ${job.id} for submission: ${submissionId}`,
    );

    return {
      jobId: job.id.toString(),
      status: 'queued',
      message: 'Plagiarism check has been queued',
    };
  }

  async getPlagiarismResult(
    submissionId: string,
    userId: string,
    role: string,
  ): Promise<any> {
    // Validate submission and permissions
    const submission = await this.prismaService.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { include: { class: true } },
        plagiarismChecks: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Check permissions
    const isStudent = role === 'STUDENT' && submission.studentId === userId;
    const isInstructor =
      role === 'INSTRUCTOR' &&
      submission.assignment.class.instructorId === userId;

    if (!isStudent && !isInstructor) {
      throw new ForbiddenException('No access to this submission');
    }

    if (!submission.plagiarismChecks) {
      return {
        submissionId,
        status: 'not_checked',
        message: 'Plagiarism check has not been performed yet',
      };
    }

    const plagiarismCheck = submission.plagiarismChecks;

    return {
      submissionId,
      status: plagiarismCheck.status,
      score: plagiarismCheck.score,
      wordCount: plagiarismCheck.wordCount,
      creditsUsed: plagiarismCheck.creditsUsed,
      checkedAt: plagiarismCheck.checkedAt.toISOString(),
      // Only include detailed results for instructors
      ...(role === 'INSTRUCTOR' &&
        plagiarismCheck.rawResponse && {
          detailedResults: plagiarismCheck.rawResponse,
        }),
    };
  }

  async getJobStatus(
    job: Job,
  ): Promise<'queued' | 'processing' | 'completed' | 'failed'> {
    const state = await job.getState();

    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }

  // Method untuk monitoring queue (untuk admin/debugging)
  async getQueueStats() {
    const waiting = await this.plagiarismQueue.getWaiting();
    const active = await this.plagiarismQueue.getActive();
    const completed = await this.plagiarismQueue.getCompleted();
    const failed = await this.plagiarismQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  // Method untuk cleanup job lama
  async cleanupOldJobs() {
    await this.plagiarismQueue.clean(7 * 24 * 60 * 60 * 1000, 'completed'); // 7 days
    await this.plagiarismQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days
  }
}
