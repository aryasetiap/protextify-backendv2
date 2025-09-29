import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      class: { findUnique: jest.fn() },
      assignment: { create: jest.fn(), findMany: jest.fn() },
    } as any;
    service = new AssignmentsService(prisma);
  });

  describe('createAssignment', () => {
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.createAssignment(
          'classId',
          { expectedStudentCount: 1, title: 'A' },
          'instructorId',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not instructor class', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'other' });
      await expect(
        service.createAssignment(
          'classId',
          { expectedStudentCount: 1, title: 'A' },
          'instructorId',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create assignment and return payment data', async () => {
      prisma.class.findUnique.mockResolvedValue({
        instructorId: 'instructorId',
      });
      prisma.assignment.create.mockResolvedValue({ id: 'assignId' });
      const dto = { expectedStudentCount: 2, title: 'A' };
      const result = await service.createAssignment(
        'classId',
        dto as any,
        'instructorId',
      );
      expect(result.assignment).toBeDefined();
      expect(result.paymentRequired).toBe(true);
      expect(result.totalPrice).toBe(5000);
      expect(result.paymentData.assignmentId).toBe('assignId');
    });
  });

  describe('getAssignments', () => {
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.getAssignments('classId', 'userId', 'INSTRUCTOR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if instructor not owner', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'other' });
      await expect(
        service.getAssignments('classId', 'userId', 'INSTRUCTOR'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return assignments for instructor', async () => {
      prisma.class.findUnique.mockResolvedValue({ instructorId: 'userId' });
      prisma.assignment.findMany.mockResolvedValue([{ id: 'a1' }]);
      const result = await service.getAssignments(
        'classId',
        'userId',
        'INSTRUCTOR',
      );
      expect(result).toEqual([{ id: 'a1' }]);
    });

    it('should return only active assignments for student', async () => {
      prisma.class.findUnique.mockResolvedValue({});
      prisma.assignment.findMany.mockResolvedValue([
        { id: 'a2', active: true },
      ]);
      const result = await service.getAssignments(
        'classId',
        'studentId',
        'STUDENT',
      );
      expect(result).toEqual([{ id: 'a2', active: true }]);
    });
  });
});
