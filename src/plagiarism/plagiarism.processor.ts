import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull'; // 🔧 Gunakan import type
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  PlagiarismJobData,
  PlagiarismJobResult,
  WinstonAIRequest,
  WinstonAIResponse,
} from './interfaces/winston-ai.interface';
import axios from 'axios';

@Processor('plagiarism')
export class PlagiarismProcessor {
  private readonly logger = new Logger(PlagiarismProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Process('check-plagiarism')
  async handlePlagiarismCheck(
    job: Job<PlagiarismJobData>,
  ): Promise<PlagiarismJobResult> {
    const { submissionId, content, instructorId, studentId } = job.data;

    this.logger.log(
      `[PLAGIARISM JOB] Starting plagiarism check for submission: ${submissionId}`,
    );

    try {
      // Update job progress
      await job.progress(10);

      // Validate submission exists and get current data
      const submission = await this.prismaService.submission.findUnique({
        where: { id: submissionId },
        include: { assignment: { include: { class: true } } },
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      if (submission.assignment.class.instructorId !== instructorId) {
        throw new Error('Unauthorized: Not your class');
      }

      await job.progress(20);

      // Prepare Winston AI request
      const winstonAIRequest: WinstonAIRequest = {
        text: content,
        language: 'en',
        country: 'us',
      };

      // Call Winston AI API
      this.logger.log(
        `[PLAGIARISM JOB] Calling Winston AI API for submission: ${submissionId}`,
      );

      const winstonAIUrl = this.configService.get<string>('WINSTON_AI_API_URL');
      const winstonAIToken = this.configService.get<string>('WINSTON_AI_TOKEN');

      if (!winstonAIUrl || !winstonAIToken) {
        throw new Error('Winston AI configuration missing');
      }

      await job.progress(30);

      const response = await axios.post<WinstonAIResponse>(
        winstonAIUrl,
        winstonAIRequest,
        {
          headers: {
            Authorization: `Bearer ${winstonAIToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 seconds timeout
        },
      );

      await job.progress(60);

      const winstonResult = response.data;

      // Save plagiarism result to database
      const plagiarismCheck = await this.prismaService.plagiarismCheck.upsert({
        where: { submissionId },
        update: {
          score: winstonResult.result.score,
          status: 'completed',
          wordCount: winstonResult.result.textWordCounts,
          creditsUsed: winstonResult.credits_used,
          rawResponse: winstonResult as any, // 🔧 Type assertion untuk Prisma Json
          checkedAt: new Date(),
        },
        create: {
          submissionId,
          score: winstonResult.result.score,
          status: 'completed',
          wordCount: winstonResult.result.textWordCounts,
          creditsUsed: winstonResult.credits_used,
          rawResponse: winstonResult as any, // 🔧 Type assertion untuk Prisma Json
          checkedAt: new Date(),
        },
      });

      await job.progress(80);

      // Send WebSocket notification to instructor
      this.realtimeGateway.sendNotification(instructorId, {
        type: 'plagiarism_completed',
        message: `Plagiarism check completed for submission. Score: ${winstonResult.result.score}%`,
        data: {
          submissionId,
          score: winstonResult.result.score,
          plagiarismCheckId: plagiarismCheck.id,
        },
        createdAt: new Date().toISOString(),
      });

      // Send WebSocket notification to student
      this.realtimeGateway.sendNotification(studentId, {
        type: 'plagiarism_completed',
        message: `Your submission has been checked for plagiarism. Score: ${winstonResult.result.score}%`,
        data: {
          submissionId,
          score: winstonResult.result.score,
        },
        createdAt: new Date().toISOString(),
      });

      // Broadcast submission update
      this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
        status: submission.status,
        plagiarismScore: winstonResult.result.score,
        updatedAt: new Date().toISOString(),
      });

      await job.progress(100);

      this.logger.log(
        `[PLAGIARISM JOB] Successfully completed plagiarism check for submission: ${submissionId}, Score: ${winstonResult.result.score}%`,
      );

      return {
        submissionId,
        score: winstonResult.result.score,
        wordCount: winstonResult.result.textWordCounts,
        creditsUsed: winstonResult.credits_used,
        rawResponse: winstonResult,
        status: 'completed',
      };
    } catch (error) {
      this.logger.error(
        `[PLAGIARISM JOB] Failed to check plagiarism for submission: ${submissionId}`,
        error,
      );

      // Save error to database
      await this.prismaService.plagiarismCheck.upsert({
        where: { submissionId },
        update: {
          status: 'failed',
          checkedAt: new Date(),
        },
        create: {
          submissionId,
          score: 0,
          status: 'failed',
          wordCount: 0,
          creditsUsed: 0,
          rawResponse: undefined, // 🔧 Gunakan undefined daripada null
          checkedAt: new Date(),
        },
      });

      // Send error notification to instructor
      this.realtimeGateway.sendNotification(instructorId, {
        type: 'plagiarism_failed',
        message: 'Plagiarism check failed. Please try again.',
        data: { submissionId, error: error.message },
        createdAt: new Date().toISOString(),
      });

      // Send error notification to student
      this.realtimeGateway.sendNotification(studentId, {
        type: 'plagiarism_failed',
        message: 'Plagiarism check failed. Your instructor has been notified.',
        data: { submissionId },
        createdAt: new Date().toISOString(),
      });

      return {
        submissionId,
        score: 0,
        wordCount: 0,
        creditsUsed: 0,
        rawResponse: undefined as any, // 🔧 Type assertion untuk error case
        status: 'failed',
        error: error.message,
      };
    }
  }
}
