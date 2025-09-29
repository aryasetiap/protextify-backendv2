import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-token-123'),
}));

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      class: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      classEnrollment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;
    service = new ClassesService(prisma);
  });

  describe('createClass', () => {
    it('should create class and return new class', async () => {
      prisma.class.create.mockResolvedValue({
        id: 'c1',
        name: 'Test',
        classToken: 'token',
      });
      const dto = { name: 'Test', description: 'desc' };
      const result = await service.createClass(dto as any, 'instructorId');
      expect(prisma.class.create).toHaveBeenCalled();
      expect(result.name).toBe('Test');
      expect(result.classToken).toBeDefined();
    });
  });

  describe('joinClass', () => {
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.joinClass({ classToken: 'token' } as any, 'studentId'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already joined', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: 'c2' });
      prisma.classEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      await expect(
        service.joinClass({ classToken: 'token' } as any, 'studentId'),
      ).rejects.toThrow(ConflictException);
    });

    it('should join class and return success message', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: 'c3' });
      prisma.classEnrollment.findUnique.mockResolvedValue(null);
      prisma.classEnrollment.create.mockResolvedValue({ id: 'e2' });
      const result = await service.joinClass(
        { classToken: 'token' } as any,
        'studentId',
      );
      expect(prisma.classEnrollment.create).toHaveBeenCalled();
      expect(result.message).toBe('Successfully joined class');
      expect(result.class.id).toBe('c3');
    });
  });

  describe('getClasses', () => {
    it('should return classes for instructor', async () => {
      prisma.class.findMany.mockResolvedValue([{ id: 'c4' }]);
      const result = await service.getClasses('instructorId', 'INSTRUCTOR');
      expect(prisma.class.findMany).toHaveBeenCalledWith({
        where: { instructorId: 'instructorId' },
      });
      expect(result).toEqual([{ id: 'c4' }]);
    });

    it('should return enrolled classes for student', async () => {
      prisma.classEnrollment.findMany.mockResolvedValue([
        { id: 'e3', class: { id: 'c5' } },
      ]);
      const result = await service.getClasses('studentId', 'STUDENT');
      expect(prisma.classEnrollment.findMany).toHaveBeenCalledWith({
        where: { studentId: 'studentId' },
        include: { class: true },
      });
      expect(result).toEqual([{ id: 'e3', class: { id: 'c5' } }]);
    });
  });

  describe('getClassDetail', () => {
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findUnique.mockResolvedValue(null);
      await expect(service.getClassDetail('classId')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return class detail', async () => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'c6',
        instructor: {},
        enrollments: [],
        assignments: [],
      });
      const result = await service.getClassDetail('c6');
      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { id: 'c6' },
        include: {
          instructor: true,
          enrollments: { include: { student: true } },
          assignments: true,
        },
      });
      expect(result.id).toBe('c6');
    });
  });
});
