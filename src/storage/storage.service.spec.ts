import { StorageService } from './storage.service';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}));

// Mock PDFKit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 0);
      }
      return this;
    }),
    pipe: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn(),
    y: 100,
    page: { height: 800 },
  }));
});

// Mock DOCX dengan HeadingLevel yang benar
jest.mock('docx', () => ({
  Document: jest.fn().mockImplementation(() => ({})),
  Paragraph: jest.fn().mockImplementation(() => ({})),
  TextRun: jest.fn().mockImplementation(() => ({})),
  HeadingLevel: {
    TITLE: 'title',
    HEADING_1: 'heading1',
    HEADING_2: 'heading2',
  },
  Packer: {
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('docx content')),
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let prisma: any;
  let cloud: any;
  let realtime: any;
  let config: any;

  beforeEach(() => {
    prisma = {
      submission: {
        findUnique: jest.fn(),
      },
    };
    cloud = {
      uploadFile: jest.fn(),
      generateFileKey: jest.fn((prefix, filename) => `${prefix}/${filename}`),
      generatePresignedUrl: jest.fn(),
      deleteFile: jest.fn(),
      healthCheck: jest.fn(),
    };
    realtime = {
      sendNotification: jest.fn(),
    };
    config = {};
    service = new StorageService(config, prisma, realtime, cloud);
  });

  describe('generatePDF', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.generatePDF('subId', 'userId', 'STUDENT'),
      ).rejects.toThrow('Submission not found');
    });

    it('should generate PDF and upload to cloud', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'subId',
        student: { fullName: 'Student' },
        assignment: {
          title: 'Title',
          class: { name: 'Class', instructorId: 'userId' },
        },
        plagiarismChecks: null,
        status: 'SUBMITTED',
        content: 'Test content',
        updatedAt: new Date(),
        grade: null,
        studentId: 'userId',
      });
      cloud.uploadFile.mockResolvedValue({
        key: 'submissions/file.pdf',
        url: 'http://cloud/file.pdf',
        size: 123,
      });
      cloud.generatePresignedUrl.mockResolvedValue('http://cloud/file.pdf');
      const result = await service.generatePDF('subId', 'userId', 'STUDENT');
      expect(result.filename).toMatch(/submission-subId-/);
      expect(result.url).toBe('http://cloud/file.pdf');
      expect(result.format).toBe('pdf');
    });
  });

  describe('generateDOCX', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.generateDOCX('subId', 'userId', 'INSTRUCTOR'),
      ).rejects.toThrow('Submission not found');
    });

    it('should generate DOCX and upload to cloud', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'subId',
        student: { fullName: 'Student' },
        assignment: {
          title: 'Title',
          class: { name: 'Class', instructorId: 'userId' },
        },
        plagiarismChecks: null,
        status: 'SUBMITTED',
        content: 'Test content',
        updatedAt: new Date(),
        grade: null,
        studentId: 'studentId',
      });
      cloud.uploadFile.mockResolvedValue({
        key: 'submissions/file.docx',
        url: 'http://cloud/file.docx',
        size: 456,
      });
      cloud.generatePresignedUrl.mockResolvedValue('http://cloud/file.docx');
      const result = await service.generateDOCX(
        'subId',
        'userId',
        'INSTRUCTOR',
      );
      expect(result.filename).toMatch(/submission-subId-/);
      expect(result.url).toBe('http://cloud/file.docx');
      expect(result.format).toBe('docx');
    });
  });

  describe('refreshDownloadUrl', () => {
    it('should return presigned url', async () => {
      cloud.generatePresignedUrl.mockResolvedValue('http://cloud/url');
      const result = await service.refreshDownloadUrl(
        'cloudKey',
        'file.pdf',
        3600,
      );
      expect(result).toBe('http://cloud/url');
    });

    it('should throw BadRequestException if cloud provider fails', async () => {
      cloud.generatePresignedUrl.mockRejectedValue(new Error('fail'));
      await expect(
        service.refreshDownloadUrl('cloudKey', 'file.pdf', 3600),
      ).rejects.toThrow('Failed to generate download URL');
    });
  });

  describe('deleteFile', () => {
    it('should call cloud deleteFile', async () => {
      cloud.deleteFile.mockResolvedValue(undefined);
      await service.deleteFile('cloudKey');
      expect(cloud.deleteFile).toHaveBeenCalledWith('cloudKey');
    });

    it('should throw error if cloud delete fails', async () => {
      cloud.deleteFile.mockRejectedValue(new Error('fail'));
      await expect(service.deleteFile('cloudKey')).rejects.toThrow(
        'Failed to delete file',
      );
    });
  });

  describe('cleanupOldFiles', () => {
    it('should log and return 0', async () => {
      const result = await service.cleanupOldFiles(7);
      expect(result).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      cloud.healthCheck.mockResolvedValue({
        status: 'healthy',
        bucket: 'bucket',
        endpoint: 'endpoint',
      });
      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.cloudStorage.status).toBe('healthy');
    });

    it('should return unhealthy status if error', async () => {
      cloud.healthCheck.mockRejectedValue(new Error('fail'));
      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('fail');
    });
  });
});