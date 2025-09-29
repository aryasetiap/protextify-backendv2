import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StorageService } from '../storage/storage.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// Membuat mock data yang konsisten untuk digunakan di seluruh test
const mockStudentId = 'student-1';
const mockInstructorId = 'instructor-1';
const mockAssignment = {
  id: 'assignment-1',
  active: true,
  expectedStudentCount: 10,
  class: { instructorId: mockInstructorId },
};
const mockSubmission = {
  id: 'submission-1',
  studentId: mockStudentId,
  assignment: mockAssignment,
  updatedAt: new Date(),
};

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: PrismaService;
  let realtimeGateway: RealtimeGateway;
  let storageService: StorageService;

  // Mock object untuk PrismaService
  const mockPrismaService = {
    assignment: {
      findUnique: jest.fn(),
    },
    submission: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
    },
  };

  // Mock object untuk RealtimeGateway
  const mockRealtimeGateway = {
    broadcastSubmissionUpdate: jest.fn(),
    sendNotification: jest.fn(),
    broadcastSubmissionListUpdated: jest.fn(),
  };

  // Mock object untuk StorageService
  const mockStorageService = {
    generatePDF: jest.fn(),
    generateDOCX: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    prisma = module.get<PrismaService>(PrismaService);
    realtimeGateway = module.get<RealtimeGateway>(RealtimeGateway);
    storageService = module.get<StorageService>(StorageService);

    // Reset semua mock sebelum setiap test untuk memastikan isolasi
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Menguji method createSubmission
  describe('createSubmission', () => {
    const dto = { content: 'Ini adalah submission baru' };

    it('should create a submission successfully', async () => {
      // Arrange: Siapkan kondisi sukses
      jest
        .spyOn(prisma.assignment, 'findUnique')
        .mockResolvedValue(mockAssignment);
      jest.spyOn(prisma.submission, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.submission, 'create')
        .mockResolvedValue(mockSubmission as any);

      // Act: Panggil method
      const result = await service.createSubmission(
        mockAssignment.id,
        dto,
        mockStudentId,
      );

      // Assert: Verifikasi hasilnya
      expect(result).toEqual(mockSubmission);
      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: {
          assignmentId: mockAssignment.id,
          studentId: mockStudentId,
          content: dto.content,
          status: 'DRAFT',
        },
      });
    });

    it('should throw ForbiddenException if assignment is not active', async () => {
      // Arrange: Siapkan kondisi assignment tidak aktif
      jest
        .spyOn(prisma.assignment, 'findUnique')
        .mockResolvedValue({ ...mockAssignment, active: false });

      // Act & Assert: Harapkan error yang sesuai
      await expect(
        service.createSubmission(mockAssignment.id, dto, mockStudentId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if assignment quota is full', async () => {
      // Arrange: Siapkan kondisi kuota penuh
      jest
        .spyOn(prisma.assignment, 'findUnique')
        .mockResolvedValue(mockAssignment);
      jest.spyOn(prisma.submission, 'count').mockResolvedValue(10); // Kuota sama dengan expected count

      // Act & Assert
      await expect(
        service.createSubmission(mockAssignment.id, dto, mockStudentId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if student has already submitted', async () => {
      // Arrange: Siapkan kondisi sudah pernah submit
      jest
        .spyOn(prisma.assignment, 'findUnique')
        .mockResolvedValue(mockAssignment);
      jest.spyOn(prisma.submission, 'count').mockResolvedValue(5);
      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(mockSubmission as any);

      // Act & Assert
      await expect(
        service.createSubmission(mockAssignment.id, dto, mockStudentId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Menguji method getSubmissionDetail
  describe('getSubmissionDetail', () => {
    it('should return submission detail for the owner student', async () => {
      jest
        .spyOn(prisma.submission, 'findUnique')
        .mockResolvedValue(mockSubmission as any);
      const result = await service.getSubmissionDetail(
        mockSubmission.id,
        mockStudentId,
        'STUDENT',
      );
      expect(result).toEqual(mockSubmission);
    });

    it('should throw ForbiddenException if a student tries to access another student submission', async () => {
      jest
        .spyOn(prisma.submission, 'findUnique')
        .mockResolvedValue(mockSubmission as any);
      await expect(
        service.getSubmissionDetail(
          mockSubmission.id,
          'another-student-id',
          'STUDENT',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      jest.spyOn(prisma.submission, 'findUnique').mockResolvedValue(null);
      await expect(
        service.getSubmissionDetail(
          mockSubmission.id,
          mockStudentId,
          'STUDENT',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // Menguji method updateContent
  describe('updateContent', () => {
    it('should update content and broadcast the update', async () => {
      const dto = { content: 'Konten telah diupdate' };
      const updatedSubmission = {
        ...mockSubmission,
        content: dto.content,
        status: 'DRAFT',
        updatedAt: new Date(),
      };
      jest
        .spyOn(prisma.submission, 'findUnique')
        .mockResolvedValue(mockSubmission as any);
      jest
        .spyOn(prisma.submission, 'update')
        .mockResolvedValue(updatedSubmission);

      const result = await service.updateContent(
        mockSubmission.id,
        dto,
        mockStudentId,
      );

      expect(result.content).toBe(dto.content);
      expect(realtimeGateway.broadcastSubmissionUpdate).toHaveBeenCalledWith(
        mockSubmission.id,
        {
          status: updatedSubmission.status,
          updatedAt: updatedSubmission.updatedAt.toISOString(),
        },
      );
    });
  });

  // Menguji method grade
  describe('grade', () => {
    it('should grade a submission and send notification', async () => {
      const grade = 95;
      const gradedSubmission = {
        ...mockSubmission,
        grade,
        status: 'GRADED',
        updatedAt: new Date(),
      };
      jest
        .spyOn(prisma.submission, 'findUnique')
        .mockResolvedValue(mockSubmission as any);
      jest
        .spyOn(prisma.submission, 'update')
        .mockResolvedValue(gradedSubmission);

      await service.grade(mockSubmission.id, grade, mockInstructorId);

      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: mockSubmission.id },
        data: { grade, status: 'GRADED' },
      });
      expect(realtimeGateway.broadcastSubmissionUpdate).toHaveBeenCalled();
      expect(realtimeGateway.sendNotification).toHaveBeenCalledWith(
        mockStudentId,
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException if instructor is not from the class', async () => {
      jest
        .spyOn(prisma.submission, 'findUnique')
        .mockResolvedValue(mockSubmission as any);
      await expect(
        service.grade(mockSubmission.id, 95, 'another-instructor-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Menguji method downloadSubmission
  describe('downloadSubmission', () => {
    it('should call generatePDF from StorageService for pdf format', async () => {
      const mockDownloadResult = {
        url: 'http://example.com/file.pdf',
        fileName: 'file.pdf',
      };
      jest
        .spyOn(storageService, 'generatePDF')
        .mockResolvedValue(mockDownloadResult);

      const result = await service.downloadSubmission(
        mockSubmission.id,
        mockStudentId,
        'STUDENT',
        'pdf',
      );

      expect(storageService.generatePDF).toHaveBeenCalledWith(
        mockSubmission.id,
        mockStudentId,
        'STUDENT',
      );
      expect(result.url).toBe(mockDownloadResult.url);
    });

    it('should call generateDOCX from StorageService for docx format', async () => {
      const mockDownloadResult = {
        url: 'http://example.com/file.docx',
        fileName: 'file.docx',
      };
      jest
        .spyOn(storageService, 'generateDOCX')
        .mockResolvedValue(mockDownloadResult);

      const result = await service.downloadSubmission(
        mockSubmission.id,
        mockStudentId,
        'STUDENT',
        'docx',
      );

      expect(storageService.generateDOCX).toHaveBeenCalledWith(
        mockSubmission.id,
        mockStudentId,
        'STUDENT',
      );
      expect(result.url).toBe(mockDownloadResult.url);
    });

    it('should throw BadRequestException for invalid format', async () => {
      await expect(
        service.downloadSubmission(
          mockSubmission.id,
          mockStudentId,
          'STUDENT',
          'txt' as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
