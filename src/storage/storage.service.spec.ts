import { Test, TestingModule } from '@nestjs/testing';
import { StorageService, GeneratedFileResult } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { nanoid } from 'nanoid';

// Mock nanoid untuk hasil yang deterministik
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id'),
}));

// Mock untuk dependensi
const mockPrismaService = {
  submission: {
    findUnique: jest.fn(),
  },
};

const mockRealtimeGateway = {
  sendNotification: jest.fn(),
};

const mockCloudStorageProvider = {
  generateFileKey: jest.fn(),
  uploadFile: jest.fn(),
  generatePresignedUrl: jest.fn(),
  deleteFile: jest.fn(),
  healthCheck: jest.fn(),
};

describe('StorageService', () => {
  let service: StorageService;
  let prisma: typeof mockPrismaService;
  let cloudStorage: typeof mockCloudStorageProvider;
  let gateway: typeof mockRealtimeGateway;

  const submissionId = 'sub-123';
  const userId = 'user-abc';
  const mockSubmission = {
    id: submissionId,
    content: 'Ini adalah konten submission untuk testing.',
    studentId: userId,
    student: { fullName: 'Budi' },
    assignment: {
      title: 'Tugas 1',
      class: { name: 'Kelas A', instructorId: 'inst-xyz' },
    },
    status: 'SUBMITTED',
    updatedAt: new Date(),
    grade: 90,
    plagiarismChecks: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: CloudStorageProvider, useValue: mockCloudStorageProvider },
        { provide: ConfigService, useValue: { get: jest.fn() } }, // ConfigService dibutuhkan oleh constructor
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    prisma = module.get(PrismaService);
    cloudStorage = module.get(CloudStorageProvider);
    gateway = module.get(RealtimeGateway);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePDF', () => {
    beforeEach(() => {
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      cloudStorage.uploadFile.mockResolvedValue({ size: 12345 } as any);
      cloudStorage.generatePresignedUrl.mockResolvedValue(
        'http://presigned.url/file.pdf',
      );
      cloudStorage.generateFileKey.mockReturnValue('submissions/file.pdf');
    });

    it('should generate, upload a PDF and return the result', async () => {
      const result = await service.generatePDF(submissionId, userId, 'STUDENT');

      expect(prisma.submission.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: submissionId } }),
      );
      expect(cloudStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'submissions/file.pdf',
        'application/pdf',
        expect.any(Object),
      );
      expect(cloudStorage.generatePresignedUrl).toHaveBeenCalledWith(
        'submissions/file.pdf',
        expect.any(Object),
      );
      expect(gateway.sendNotification).toHaveBeenCalled();
      expect(result.format).toBe('pdf');
      expect(result.url).toBe('http://presigned.url/file.pdf');
    });

    it('should throw NotFoundException if submission is not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.generatePDF(submissionId, userId, 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateDOCX', () => {
    beforeEach(() => {
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      cloudStorage.uploadFile.mockResolvedValue({ size: 23456 } as any);
      cloudStorage.generatePresignedUrl.mockResolvedValue(
        'http://presigned.url/file.docx',
      );
      cloudStorage.generateFileKey.mockReturnValue('submissions/file.docx');
    });

    it('should generate, upload a DOCX and return the result', async () => {
      const result = await service.generateDOCX(
        submissionId,
        userId,
        'STUDENT',
      );

      expect(prisma.submission.findUnique).toHaveBeenCalled();
      expect(cloudStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'submissions/file.docx',
        expect.any(String),
        expect.any(Object),
      );
      expect(cloudStorage.generatePresignedUrl).toHaveBeenCalled();
      expect(gateway.sendNotification).toHaveBeenCalled();
      expect(result.format).toBe('docx');
      expect(result.url).toBe('http://presigned.url/file.docx');
    });

    it('should throw BadRequestException if user does not have permission', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        studentId: 'another-student-id',
      });
      await expect(
        service.generateDOCX(submissionId, userId, 'STUDENT'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when provider is healthy', async () => {
      cloudStorage.healthCheck.mockResolvedValue({ status: 'healthy' });
      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.cloudStorage.status).toBe('healthy');
    });

    it('should return unhealthy status when provider throws error', async () => {
      cloudStorage.healthCheck.mockRejectedValue(
        new Error('Connection failed'),
      );
      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection failed');
    });
  });
});
