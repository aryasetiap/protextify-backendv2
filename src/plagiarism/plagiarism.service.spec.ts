import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismService } from './plagiarism.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Queue, Job } from 'bull';

// Mock untuk PrismaService
const mockPrismaService = {
  submission: {
    findUnique: jest.fn(),
  },
  plagiarismCheck: {
    upsert: jest.fn(),
  },
};

// Mock untuk Bull Queue
const mockPlagiarismQueue = {
  add: jest.fn(),
  getJobs: jest.fn(),
  getWaiting: jest.fn(),
  getActive: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
  clean: jest.fn(),
};

describe('PlagiarismService', () => {
  let service: PlagiarismService;
  let prisma: typeof mockPrismaService;
  let queue: typeof mockPlagiarismQueue;

  const instructorId = 'instructor-123';
  const submissionId = 'submission-abc';
  const mockSubmission = {
    id: submissionId,
    content: 'a'.repeat(101),
    status: 'SUBMITTED',
    studentId: 'student-456',
    // PERBAIKAN: Menambahkan objek student yang lengkap
    student: { fullName: 'Budi Siswa' },
    assignment: {
      title: 'Tugas Sejarah',
      class: {
        name: 'Kelas Sejarah',
        instructorId: instructorId,
      },
    },
    plagiarismChecks: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlagiarismService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: getQueueToken('plagiarism'),
          useValue: mockPlagiarismQueue,
        },
      ],
    }).compile();

    service = module.get<PlagiarismService>(PlagiarismService);
    prisma = module.get(PrismaService);
    queue = module.get(getQueueToken('plagiarism'));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPlagiarism', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.checkPlagiarism(submissionId, {}, instructorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if instructor is not owner', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          ...mockSubmission.assignment,
          class: {
            ...mockSubmission.assignment.class,
            instructorId: 'other-instructor',
          },
        },
      });
      await expect(
        service.checkPlagiarism(submissionId, {}, instructorId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for empty content', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        content: ' ',
      });
      await expect(
        service.checkPlagiarism(submissionId, {}, instructorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should queue a job if all validations pass', async () => {
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      queue.getJobs.mockResolvedValue([]);
      queue.add.mockResolvedValue({ id: 'job-1' } as Job);

      const result = await service.checkPlagiarism(
        submissionId,
        {},
        instructorId,
      );

      expect(prisma.plagiarismCheck.upsert).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        'check-plagiarism',
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({
        jobId: 'job-1',
        status: 'queued',
        message: 'Plagiarism check has been queued',
      });
    });

    it('should return existing job info if a job is pending', async () => {
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      const pendingJob = {
        id: 'job-already-pending',
        data: { submissionId },
        getState: async () => 'waiting',
      };
      queue.getJobs.mockResolvedValue([pendingJob] as any);

      const result = await service.checkPlagiarism(
        submissionId,
        {},
        instructorId,
      );

      expect(queue.add).not.toHaveBeenCalled();
      expect(result.jobId).toBe(pendingJob.id);
      expect(result.message).toContain('already in progress');
    });

    it('should return completed status if already checked', async () => {
      const completedSubmission = {
        ...mockSubmission,
        plagiarismChecks: {
          status: 'completed',
          score: 25,
          wordCount: 150,
          creditsUsed: 1,
          checkedAt: new Date(),
        },
      };
      prisma.submission.findUnique.mockResolvedValue(completedSubmission);
      // PERBAIKAN: Mock getJobs untuk memastikan tidak ada job pending
      queue.getJobs.mockResolvedValue([]);

      const result = await service.checkPlagiarism(
        submissionId,
        {},
        instructorId,
      );

      expect(queue.add).not.toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.score).toBe(25);
    });
  });

  describe('getPlagiarismResult', () => {
    const userId = 'user-123';
    const mockResult = {
      ...mockSubmission,
      plagiarismChecks: {
        status: 'completed',
        score: 15,
        wordCount: 200,
        creditsUsed: 2,
        checkedAt: new Date(),
        rawResponse: { sources: [] },
      },
    };

    it('should return results for an authorized instructor', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockResult,
        assignment: {
          ...mockResult.assignment,
          class: { ...mockResult.assignment.class, instructorId: userId },
        },
      });

      const result = await service.getPlagiarismResult(
        submissionId,
        userId,
        'INSTRUCTOR',
      );

      expect(result.score).toBe(15);
      expect(result.detailedResults).toBeDefined(); // Instructor gets detailed results
      expect(result.pdfReportUrl).toBeDefined();
    });

    it('should return results for an authorized student', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockResult,
        studentId: userId,
      });

      const result = await service.getPlagiarismResult(
        submissionId,
        userId,
        'STUDENT',
      );

      expect(result.score).toBe(15);
      expect(result.detailedResults).toBeUndefined(); // Student does not get detailed results
      expect(result.pdfReportUrl).toBeDefined();
    });

    it('should return "not_checked" status if no check exists', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        studentId: userId,
        plagiarismChecks: null,
      });

      const result = await service.getPlagiarismResult(
        submissionId,
        userId,
        'STUDENT',
      );

      expect(result.status).toBe('not_checked');
    });
  });
});
