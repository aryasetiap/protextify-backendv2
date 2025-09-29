import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismProcessor } from './plagiarism.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import axios from 'axios';
import type { Job } from 'bull';
import {
  PlagiarismJobData,
  WinstonAIResponse,
} from './interfaces/winston-ai.interface';

// Mock dependensi
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrismaService = {
  submission: {
    findUnique: jest.fn(),
  },
  plagiarismCheck: {
    upsert: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'WINSTON_AI_API_URL') return 'http://mock-winston-ai.com';
    if (key === 'WINSTON_AI_TOKEN') return 'mock-token';
    return null;
  }),
};

const mockRealtimeGateway = {
  sendNotification: jest.fn(),
  broadcastSubmissionUpdate: jest.fn(),
};

describe('PlagiarismProcessor', () => {
  let processor: PlagiarismProcessor;
  let prisma: typeof mockPrismaService;
  let gateway: typeof mockRealtimeGateway;

  const jobData: PlagiarismJobData = {
    submissionId: 'submission-123',
    content: 'This is the submission content.',
    instructorId: 'instructor-abc',
    studentId: 'student-xyz',
  };

  const mockJob = {
    data: jobData,
    progress: jest.fn(),
  } as unknown as Job<PlagiarismJobData>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlagiarismProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
      ],
    }).compile();

    processor = module.get<PlagiarismProcessor>(PlagiarismProcessor);
    prisma = module.get(PrismaService);
    gateway = module.get(RealtimeGateway);
    jest.clearAllMocks();

    // PERBAIKAN: Pindahkan mock setup ke dalam beforeEach
    // agar `prisma` sudah terdefinisi.
    const mockPlagiarismCheckResult = { id: 'plg-check-id-123' };
    prisma.plagiarismCheck.upsert.mockResolvedValue(mockPlagiarismCheckResult);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handlePlagiarismCheck', () => {
    const mockSubmission = {
      id: jobData.submissionId,
      status: 'SUBMITTED',
      assignment: { class: { instructorId: jobData.instructorId } },
    };

    const mockWinstonAIResponse: WinstonAIResponse = {
      result: { score: 42, textWordCounts: 150 },
      credits_used: 1,
    } as any;

    it('should successfully process a plagiarism check', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockedAxios.post.mockResolvedValue({ data: mockWinstonAIResponse });

      // Act
      const result = await processor.handlePlagiarismCheck(mockJob);

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://mock-winston-ai.com',
        expect.any(Object),
        expect.any(Object),
      );
      expect(prisma.plagiarismCheck.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { submissionId: jobData.submissionId },
          update: expect.objectContaining({ status: 'completed', score: 42 }),
        }),
      );
      expect(gateway.sendNotification).toHaveBeenCalledTimes(2); // one for instructor, one for student
      expect(gateway.broadcastSubmissionUpdate).toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.score).toBe(42);
    });

    it('should handle API failure gracefully', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await processor.handlePlagiarismCheck(mockJob);

      // Assert
      // PERBAIKAN: Assertion lebih spesifik dan akurat
      expect(prisma.plagiarismCheck.upsert).toHaveBeenCalledWith({
        where: { submissionId: jobData.submissionId },
        update: {
          status: 'failed',
          checkedAt: expect.any(Date),
        },
        create: {
          submissionId: jobData.submissionId,
          score: 0,
          status: 'failed',
          wordCount: 0,
          creditsUsed: 0,
          rawResponse: undefined,
          checkedAt: expect.any(Date),
        },
      });
      expect(gateway.sendNotification).toHaveBeenCalledTimes(2); // Failure notifications
      expect(result.status).toBe('failed');
      expect(result.error).toBe('API Error');
    });

    it('should handle submission not found error', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue(null);

      // Act
      const result = await processor.handlePlagiarismCheck(mockJob);

      // Assert
      expect(mockedAxios.post).not.toHaveBeenCalled();
      // PERBAIKAN: Assertion lebih spesifik dan akurat
      expect(prisma.plagiarismCheck.upsert).toHaveBeenCalledWith({
        where: { submissionId: jobData.submissionId },
        update: {
          status: 'failed',
          checkedAt: expect.any(Date),
        },
        create: {
          submissionId: jobData.submissionId,
          score: 0,
          status: 'failed',
          wordCount: 0,
          creditsUsed: 0,
          rawResponse: undefined,
          checkedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Submission not found');
    });
  });
});
