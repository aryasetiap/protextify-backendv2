import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
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
import * as https from 'https';

type WinstonAIProviderMode = 'mock' | 'real';

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
    const {
      submissionId,
      content,
      instructorId,
      studentId,
      excluded_sources,
      language,
      country,
    } = job.data;

    this.logger.log(
      `[PLAGIARISM JOB] Starting plagiarism check for submission: ${submissionId}`,
    );

    try {
      await job.progress(10);

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

      const winstonAIRequest: WinstonAIRequest = {
        text: content,
        language: language || 'id',
        country: country || 'id',
        ...(excluded_sources && { excluded_sources }),
      };

      await job.progress(30);

      const providerMode = this.getProviderMode();
      this.logger.log(
        `[PLAGIARISM JOB] Using Winston AI provider mode: ${providerMode}`,
      );

      const providerStartedAt = Date.now();
      const winstonResult = await this.executeWinstonAIRequest(
        winstonAIRequest,
        providerMode,
      );
      const providerLatencyMs = Date.now() - providerStartedAt;

      await job.progress(60);

      const rawResponse = {
        ...winstonResult,
        metadata: {
          providerMode,
          providerLatencyMs,
          completedAt: new Date().toISOString(),
        },
      };

      const plagiarismCheck = await this.prismaService.plagiarismCheck.upsert({
        where: { submissionId },
        update: {
          score: winstonResult.result.score,
          status: 'completed',
          wordCount: winstonResult.result.textWordCounts,
          creditsUsed: winstonResult.credits_used,
          rawResponse: rawResponse as any,
          checkedAt: new Date(),
        },
        create: {
          submissionId,
          score: winstonResult.result.score,
          status: 'completed',
          wordCount: winstonResult.result.textWordCounts,
          creditsUsed: winstonResult.credits_used,
          rawResponse: rawResponse as any,
          checkedAt: new Date(),
        },
      });

      await job.progress(80);

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

      this.realtimeGateway.sendNotification(studentId, {
        type: 'plagiarism_completed',
        message: `Your submission has been checked for plagiarism. Score: ${winstonResult.result.score}%`,
        data: {
          submissionId,
          score: winstonResult.result.score,
        },
        createdAt: new Date().toISOString(),
      });

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
        rawResponse: rawResponse as any,
        status: 'completed',
      };
    } catch (error) {
      if (error && error.isAxiosError) {
        if (error.response) {
          this.logger.error(
            `[PLAGIARISM JOB] Winston AI Response Error: Status ${error.response.status}`,
          );
        } else if (error.request) {
          this.logger.error(
            '[PLAGIARISM JOB] Winston AI request was made but no response was received.',
          );
        } else {
          this.logger.error(
            `[PLAGIARISM JOB] Axios error during setup: ${error.message}`,
          );
        }
      }

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
          rawResponse: undefined,
          checkedAt: new Date(),
        },
      });

      this.realtimeGateway.sendNotification(instructorId, {
        type: 'plagiarism_failed',
        message: 'Plagiarism check failed. Please try again.',
        data: { submissionId, error: error.message },
        createdAt: new Date().toISOString(),
      });

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
        rawResponse: undefined,
        status: 'failed',
        error: error.message,
      };
    }
  }

  private getProviderMode(): WinstonAIProviderMode {
    const explicitMode = this.configService.get<string>('WINSTON_AI_MODE');

    if (explicitMode === 'mock' || explicitMode === 'real') {
      return explicitMode;
    }

    return this.configService.get<string>('NODE_ENV') === 'production'
      ? 'real'
      : 'mock';
  }

  private async executeWinstonAIRequest(
    request: WinstonAIRequest,
    providerMode: WinstonAIProviderMode,
  ): Promise<WinstonAIResponse> {
    if (providerMode === 'mock') {
      return this.buildMockWinstonAIResponse(request);
    }

    this.logger.log('[PLAGIARISM JOB] Calling Winston AI API in real mode');

    const winstonAIUrl = this.configService.get<string>('WINSTON_AI_API_URL');
    const winstonAIToken = this.configService.get<string>('WINSTON_AI_TOKEN');

    if (!winstonAIUrl || !winstonAIToken) {
      throw new Error('Winston AI configuration missing');
    }

    const httpsAgent = new https.Agent({ keepAlive: false });
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${winstonAIToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
      httpsAgent,
    };

    const response = await axios.post<WinstonAIResponse>(
      winstonAIUrl,
      request,
      axiosConfig,
    );

    return response.data;
  }

  private buildMockWinstonAIResponse(
    request: WinstonAIRequest,
  ): WinstonAIResponse {
    const wordCount = request.text.trim().split(/\s+/).filter(Boolean).length;
    const plagiarismWords = Math.max(1, Math.round(wordCount * 0.08));
    const sampleLength = Math.min(request.text.length, 80);
    const sample = request.text.slice(0, sampleLength);

    return {
      status: 200,
      scanInformation: {
        service: 'winston-ai-mock',
        scanTime: new Date().toISOString(),
        inputType: 'text',
      },
      result: {
        score: 8,
        sourceCounts: 1,
        textWordCounts: wordCount,
        totalPlagiarismWords: plagiarismWords,
        identicalWordCounts: Math.max(1, Math.round(plagiarismWords / 2)),
        similarWordCounts: Math.max(0, Math.floor(plagiarismWords / 2)),
      },
      sources: [
        {
          score: 8,
          canAccess: true,
          url: 'https://example.test/thesis-perf/mock-source',
          title: 'THESIS_PERF Mock Source',
          plagiarismWords,
          identicalWordCounts: Math.max(1, Math.round(plagiarismWords / 2)),
          similarWordCounts: Math.max(0, Math.floor(plagiarismWords / 2)),
          totalNumberOfWords: wordCount,
          citation: false,
          plagiarismFound: [
            {
              startIndex: 0,
              endIndex: sampleLength,
              sequence: sample,
            },
          ],
          is_excluded: false,
        },
      ],
      attackDetected: {
        zero_width_space: false,
        homoglyph_attack: false,
      },
      text: request.text,
      similarWords: [],
      citations: [],
      indexes: [
        {
          startIndex: 0,
          endIndex: sampleLength,
          sequence: sample,
        },
      ],
      credits_used: 0,
      credits_remaining: 0,
    };
  }
}
