import { SubmissionsService } from './submissions.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}));

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: any;
  let realtime: any;
  let storage: any;

  beforeEach(() => {
    prisma = {
      assignment: { findUnique: jest.fn() },
      submission: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      class: { findUnique: jest.fn() },
    };
    realtime = {
      broadcastSubmissionUpdate: jest.fn(),
      sendNotification: jest.fn(),
      broadcastSubmissionListUpdated: jest.fn(),
    };
    storage = {
      generatePDF: jest.fn(),
      generateDOCX: jest.fn(),
    };
    service = new SubmissionsService(prisma, realtime, storage);
  });

  describe('createSubmission', () => {
    it('should throw ForbiddenException if assignment not active', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ active: false });
      await expect(
        service.createSubmission('aid', { content: 'abc' }, 'sid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if quota full', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        active: true,
        expectedStudentCount: 1,
      });
      prisma.submission.count.mockResolvedValue(1);
      await expect(
        service.createSubmission('aid', { content: 'abc' }, 'sid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if already submitted', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        active: true,
        expectedStudentCount: 2,
      });
      prisma.submission.count.mockResolvedValue(0);
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub1' });
      await expect(
        service.createSubmission('aid', { content: 'abc' }, 'sid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create submission', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        active: true,
        expectedStudentCount: 2,
      });
      prisma.submission.count.mockResolvedValue(0);
      prisma.submission.findFirst.mockResolvedValue(null);
      prisma.submission.create.mockResolvedValue({
        id: 'sub2',
        content: 'abc',
      });
      const result = await service.createSubmission(
        'aid',
        { content: 'abc' },
        'sid',
      );
      expect(result.id).toBe('sub2');
    });
  });

  describe('getSubmissionDetail', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.getSubmissionDetail('subid', 'uid', 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner (student)', async () => {
      prisma.submission.findUnique.mockResolvedValue({ studentId: 'other' });
      await expect(
        service.getSubmissionDetail('subid', 'uid', 'STUDENT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return submission for instructor', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'sid',
        assignment: {},
        plagiarismChecks: {},
      });
      const result = await service.getSubmissionDetail(
        'subid',
        'uid',
        'INSTRUCTOR',
      );
      expect(result.studentId).toBe('sid');
    });
  });

  describe('updateContent', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(
        service.updateContent('subid', { content: 'abc' }, 'uid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.submission.findUnique.mockResolvedValue({ studentId: 'other' });
      await expect(
        service.updateContent('subid', { content: 'abc' }, 'uid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update content and broadcast', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'uid',
        status: 'DRAFT',
      });
      prisma.submission.update.mockResolvedValue({
        id: 'subid',
        status: 'DRAFT',
        updatedAt: new Date(),
      });
      const result = await service.updateContent(
        'subid',
        { content: 'abc' },
        'uid',
      );
      expect(result.id).toBe('subid');
      expect(realtime.broadcastSubmissionUpdate).toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.submit('subid', 'uid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.submission.findUnique.mockResolvedValue({ studentId: 'other' });
      await expect(service.submit('subid', 'uid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update status to SUBMITTED', async () => {
      prisma.submission.findUnique.mockResolvedValue({ studentId: 'uid' });
      prisma.submission.update.mockResolvedValue({
        id: 'subid',
        status: 'SUBMITTED',
      });
      const result = await service.submit('subid', 'uid');
      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('grade', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.grade('subid', 90, 'iid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not instructor', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'other' } },
      });
      await expect(service.grade('subid', 90, 'iid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update grade and send notification', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        assignment: { class: { instructorId: 'iid' }, title: 'Assignment' },
        studentId: 'sid',
      });
      prisma.submission.update.mockResolvedValue({
        id: 'subid',
        status: 'GRADED',
        updatedAt: new Date(),
      });
      const result = await service.grade('subid', 90, 'iid');
      expect(result.status).toBe('GRADED');
      expect(realtime.sendNotification).toHaveBeenCalled();
      expect(realtime.broadcastSubmissionUpdate).toHaveBeenCalled();
    });
  });

  describe('getSubmissionsForAssignment', () => {
    it('should throw ForbiddenException if not instructor', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'other' });
      await expect(
        service.getSubmissionsForAssignment('cid', 'aid', 'iid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return submissions and broadcast list updated', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'iid' });
      prisma.submission.findMany.mockResolvedValue([
        {
          id: 'sub1',
          studentId: 'sid',
          status: 'SUBMITTED',
          plagiarismChecks: { score: 10 },
          updatedAt: new Date(),
        },
      ]);
      const result = await service.getSubmissionsForAssignment(
        'cid',
        'aid',
        'iid',
      );
      expect(Array.isArray(result)).toBe(true);
      expect(realtime.broadcastSubmissionListUpdated).toHaveBeenCalled();
    });
  });

  describe('getStudentHistory', () => {
    it('should return student history', async () => {
      prisma.submission.findMany.mockResolvedValue([{ id: 'sub1' }]);
      const result = await service.getStudentHistory('sid');
      expect(result).toEqual([{ id: 'sub1' }]);
    });
  });

  describe('getClassHistory', () => {
    it('should throw ForbiddenException if not instructor', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'other' });
      await expect(service.getClassHistory('cid', 'iid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return class history', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'iid' });
      prisma.submission.findMany.mockResolvedValue([{ id: 'sub1' }]);
      const result = await service.getClassHistory('cid', 'iid');
      expect(result).toEqual([{ id: 'sub1' }]);
    });
  });

  describe('downloadSubmission', () => {
    it('should throw BadRequestException if format invalid', async () => {
      await expect(
        service.downloadSubmission('subid', 'uid', 'STUDENT', 'txt'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call generatePDF for pdf', async () => {
      storage.generatePDF.mockResolvedValue({
        filename: 'file.pdf',
        url: 'url',
        format: 'pdf',
        size: 123,
      });
      const result = await service.downloadSubmission(
        'subid',
        'uid',
        'STUDENT',
        'pdf',
      );
      expect(storage.generatePDF).toHaveBeenCalledWith(
        'subid',
        'uid',
        'STUDENT',
      );
      expect(result.format).toBe('pdf');
    });

    it('should call generateDOCX for docx', async () => {
      storage.generateDOCX.mockResolvedValue({
        filename: 'file.docx',
        url: 'url',
        format: 'docx',
        size: 456,
      });
      const result = await service.downloadSubmission(
        'subid',
        'uid',
        'INSTRUCTOR',
        'docx',
      );
      expect(storage.generateDOCX).toHaveBeenCalledWith(
        'subid',
        'uid',
        'INSTRUCTOR',
      );
      expect(result.format).toBe('docx');
    });

    it('should throw BadRequestException if storage fails', async () => {
      storage.generatePDF.mockRejectedValue(new Error('fail'));
      await expect(
        service.downloadSubmission('subid', 'uid', 'STUDENT', 'pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
