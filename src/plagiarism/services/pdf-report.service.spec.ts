import { Test, TestingModule } from '@nestjs/testing';
import { PDFReportService } from './pdf-report.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Mock untuk PrismaService
const mockPrismaService = {
  submission: {
    findUnique: jest.fn(),
  },
};

// Mock untuk ConfigService (walaupun tidak digunakan di logic, tetap best practice untuk provide)
const mockConfigService = {
  get: jest.fn(),
};

describe('PDFReportService', () => {
  let service: PDFReportService;
  let prisma: typeof mockPrismaService;

  const submissionId = 'submission-pdf-123';
  const mockSubmissionData = {
    id: submissionId,
    content: 'This is the content for the PDF report test.',
    student: { fullName: 'Andi Mahasiswa' },
    assignment: { title: 'Laporan Akhir', class: { name: 'Kelas A' } },
    plagiarismChecks: {
      score: 33,
      wordCount: 150,
      creditsUsed: 1,
      checkedAt: new Date(),
      rawResponse: {
        sources: [
          { title: 'Source 1', score: 80, url: 'http://source1.com' },
          { title: 'Source 2', score: 60, url: 'http://source2.com' },
        ],
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PDFReportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PDFReportService>(PDFReportService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePlagiarismReport', () => {
    it('should generate a non-empty PDF buffer for a valid submission', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue(mockSubmissionData);

      // Act
      const pdfBuffer = await service.generatePlagiarismReport(
        submissionId,
        true,
      );

      // Assert
      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: { id: submissionId },
        include: expect.any(Object),
      });
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should throw an error if submission is not found', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generatePlagiarismReport(submissionId),
      ).rejects.toThrow('Submission or plagiarism check not found');
    });

    it('should throw an error if plagiarism check data is missing', async () => {
      // Arrange
      prisma.submission.findUnique.mockResolvedValue({
        ...mockSubmissionData,
        plagiarismChecks: null,
      });

      // Act & Assert
      await expect(
        service.generatePlagiarismReport(submissionId),
      ).rejects.toThrow('Submission or plagiarism check not found');
    });
  });
});
