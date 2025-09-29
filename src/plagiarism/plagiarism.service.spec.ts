import { PlagiarismService } from './plagiarism.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PlagiarismService', () => {
  let service: PlagiarismService;
  let prisma: jest.Mocked<PrismaService>;
  let queue: any;

  beforeEach(() => {
    prisma = {
      submission: { findUnique: jest.fn() },
      plagiarismCheck: { upsert: jest.fn() },
    } as any;
    queue = {
      getJobs: jest.fn(),
      add: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      clean: jest.fn(),
    };
    service = new PlagiarismService(prisma, queue);
  });

  describe('checkPlagiarism', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.checkPlagiarism('subId', {}, 'instrId'),
      ).rejects.toThrow('Submission not found');
    });

    it('should throw ForbiddenException if not instructor', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'other' } },
      });
      await expect(
        service.checkPlagiarism('subId', {}, 'instrId'),
      ).rejects.toThrow('Not your class');
    });

    it('should throw BadRequestException if not submitted', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'instrId' } },
        status: 'DRAFT',
      });
      await expect(
        service.checkPlagiarism('subId', {}, 'instrId'),
      ).rejects.toThrow(
        'Only submitted submissions can be checked for plagiarism',
      );
    });

    it('should throw BadRequestException if content empty', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'instrId' } },
        status: 'SUBMITTED',
        content: '',
      });
      await expect(
        service.checkPlagiarism('subId', {}, 'instrId'),
      ).rejects.toThrow('Submission content is empty');
    });

    it('should return job info if already queued', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'instrId' } },
        status: 'SUBMITTED',
        content: 'a'.repeat(200),
        plagiarismChecks: null,
        studentId: 'studentId',
      });
      queue.getJobs.mockResolvedValue([
        {
          data: { submissionId: 'subId' },
          id: 123,
          getState: jest.fn().mockResolvedValue('waiting'),
        },
      ]);
      const result = await service.checkPlagiarism('subId', {}, 'instrId');
      expect(result.jobId).toBe('123');
      expect(result.status).toBe('queued');
    });

    it('should return completed result if already completed', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'instrId' } },
        status: 'SUBMITTED',
        content: 'a'.repeat(200),
        plagiarismChecks: {
          status: 'completed',
          score: 10,
          wordCount: 100,
          creditsUsed: 1,
          checkedAt: new Date(),
        },
        studentId: 'studentId',
      });
      // Mock getJobs to return empty array untuk completed case
      queue.getJobs.mockResolvedValue([]);
      const result = await service.checkPlagiarism('subId', {}, 'instrId');
      expect(result.status).toBe('completed');
      expect(result.score).toBe(10);
    });

    it('should queue job if valid', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'instrId' } },
        status: 'SUBMITTED',
        content: 'a'.repeat(200),
        plagiarismChecks: null,
        studentId: 'studentId',
      });
      queue.getJobs.mockResolvedValue([]);
      queue.add.mockResolvedValue({
        id: 456,
        getState: jest.fn().mockResolvedValue('waiting'),
      });
      prisma.plagiarismCheck.upsert.mockResolvedValue({});
      const result = await service.checkPlagiarism('subId', {}, 'instrId');
      expect(result.jobId).toBe('456');
      expect(result.status).toBe('queued');
    });
  });

  describe('getPlagiarismResult', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.getPlagiarismResult('subId', 'uid', 'STUDENT'),
      ).rejects.toThrow('Submission not found');
    });

    it('should throw ForbiddenException if no access', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'other',
        assignment: { class: { instructorId: 'other' } },
      });
      await expect(
        service.getPlagiarismResult('subId', 'uid', 'STUDENT'),
      ).rejects.toThrow('No access to this submission');
    });

    it('should return not_checked if no plagiarismChecks', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'uid',
        assignment: { class: { instructorId: 'other' } },
        plagiarismChecks: null,
      });
      const result = await service.getPlagiarismResult(
        'subId',
        'uid',
        'STUDENT',
      );
      expect(result.status).toBe('not_checked');
    });

    it('should return completed result with pdfReportUrl', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'uid',
        assignment: { class: { instructorId: 'other' } },
        plagiarismChecks: {
          status: 'completed',
          score: 10,
          wordCount: 100,
          creditsUsed: 1,
          checkedAt: new Date(),
          rawResponse: {},
        },
      });
      service['generatePDFReportUrl'] = jest.fn().mockResolvedValue('mock-url');
      const result = await service.getPlagiarismResult(
        'subId',
        'uid',
        'STUDENT',
      );
      expect(result.status).toBe('completed');
      expect(result.pdfReportUrl).toBe('mock-url');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue stats', async () => {
      queue.getWaiting.mockResolvedValue([{}, {}]);
      queue.getActive.mockResolvedValue([{}]);
      queue.getCompleted.mockResolvedValue([{}, {}, {}]);
      queue.getFailed.mockResolvedValue([{}]);
      const result = await service.getQueueStats();
      expect(result.waiting).toBe(2);
      expect(result.active).toBe(1);
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(7);
    });
  });
});
