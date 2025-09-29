import { PlagiarismProcessor } from './plagiarism.processor';

describe('PlagiarismProcessor', () => {
  let processor: PlagiarismProcessor;
  let config: any;
  let prisma: any;
  let realtime: any;

  beforeEach(() => {
    config = { get: jest.fn() };
    prisma = {
      submission: { findUnique: jest.fn() },
      plagiarismCheck: { upsert: jest.fn() },
    };
    realtime = {
      sendNotification: jest.fn(),
      broadcastSubmissionUpdate: jest.fn(),
    };
    processor = new PlagiarismProcessor(config, prisma, realtime);
  });

  it('should return failed status if submission not found', async () => {
    prisma.submission.findUnique.mockResolvedValue(null);
    const job = {
      data: { submissionId: 'subId', instructorId: 'instrId' },
      progress: jest.fn(),
    };
    const result = await processor.handlePlagiarismCheck(job as any);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Submission not found');
  });

  it('should return failed status if not instructor', async () => {
    prisma.submission.findUnique.mockResolvedValue({
      assignment: { class: { instructorId: 'other' } },
    });
    const job = {
      data: { submissionId: 'subId', instructorId: 'instrId' },
      progress: jest.fn(),
    };
    const result = await processor.handlePlagiarismCheck(job as any);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Unauthorized: Not your class');
  });

  it('should process plagiarism and send notifications', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'WINSTON_AI_API_URL') return 'http://winston';
      if (key === 'WINSTON_AI_TOKEN') return 'token';
      return undefined;
    });
    prisma.submission.findUnique.mockResolvedValue({
      assignment: { class: { instructorId: 'instrId' } },
      status: 'SUBMITTED',
    });
    const axios = require('axios');
    axios.post = jest.fn().mockResolvedValue({
      data: {
        result: { score: 10, textWordCounts: 100 },
        credits_used: 1,
      },
    });
    prisma.plagiarismCheck.upsert.mockResolvedValue({ id: 'pcid' });
    const job = {
      data: {
        submissionId: 'subId',
        instructorId: 'instrId',
        studentId: 'studentId',
        content: 'abc',
      },
      progress: jest.fn(),
    };
    const result = await processor.handlePlagiarismCheck(job as any);
    expect(result.status).toBe('completed');
    expect(realtime.sendNotification).toHaveBeenCalled();
    expect(realtime.broadcastSubmissionUpdate).toHaveBeenCalled();
  });

  it('should handle error and send failed notifications', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'WINSTON_AI_API_URL') return 'http://winston';
      if (key === 'WINSTON_AI_TOKEN') return 'token';
      return undefined;
    });
    prisma.submission.findUnique.mockResolvedValue({
      assignment: { class: { instructorId: 'instrId' } },
      status: 'SUBMITTED',
    });
    const axios = require('axios');
    axios.post = jest.fn().mockRejectedValue(new Error('fail'));
    prisma.plagiarismCheck.upsert.mockResolvedValue({});
    const job = {
      data: {
        submissionId: 'subId',
        instructorId: 'instrId',
        studentId: 'studentId',
        content: 'abc',
      },
      progress: jest.fn(),
    };
    const result = await processor.handlePlagiarismCheck(job as any);
    expect(result.status).toBe('failed');
    expect(realtime.sendNotification).toHaveBeenCalled();
  });
});
