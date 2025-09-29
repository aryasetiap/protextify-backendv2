import { PDFReportService } from './pdf-report.service';

describe('PDFReportService', () => {
  let service: PDFReportService;
  let prisma: any;
  let config: any;

  beforeEach(() => {
    prisma = {
      submission: {
        findUnique: jest.fn(),
      },
    };
    config = {};
    service = new PDFReportService(config, prisma);
  });

  it('should throw error if submission or plagiarism check not found', async () => {
    prisma.submission.findUnique.mockResolvedValue(null);
    await expect(service.generatePlagiarismReport('subId')).rejects.toThrow(
      'Submission or plagiarism check not found',
    );
  });

  it('should generate PDF buffer', async () => {
    prisma.submission.findUnique.mockResolvedValue({
      student: { fullName: 'Student' },
      assignment: { title: 'Title', class: { name: 'Class' } },
      plagiarismChecks: {
        score: 10,
        wordCount: 100,
        creditsUsed: 1,
        checkedAt: new Date(),
        rawResponse: {
          sources: [{ title: 'Source', score: 50, url: 'http://url' }],
        },
      },
      content: 'Test content',
    });
    const buffer = await service.generatePlagiarismReport('subId', true);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
