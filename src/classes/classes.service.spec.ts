import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

// Mockup untuk PrismaService dan nanoid
// Kita mock nanoid agar menghasilkan nilai yang predictable dalam test
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mockToken'),
}));

const mockPrismaService = {
  class: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  classEnrollment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    prisma = module.get(PrismaService);

    // Reset semua mock sebelum setiap test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Pengujian untuk method createClass
  describe('createClass', () => {
    // Kasus normal: berhasil membuat kelas baru
    it('should create and return a new class with a unique token', async () => {
      const dto: CreateClassDto = {
        name: 'Kelas Baru',
        description: 'Deskripsi kelas baru',
      };
      const instructorId = 'instructor-123';
      const mockClass = {
        id: 'class-abc',
        ...dto,
        instructorId,
        classToken: 'mockToken',
      };

      // Arrange
      prisma.class.create.mockResolvedValue(mockClass);

      // Act
      const result = await service.createClass(dto, instructorId);

      // Assert
      expect(prisma.class.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          instructorId,
          classToken: 'mockToken', // nanoid akan menghasilkan ini karena sudah di-mock
        },
      });
      expect(result).toEqual(mockClass);
    });
  });

  // Pengujian untuk method joinClass
  describe('joinClass', () => {
    const dto: JoinClassDto = { classToken: 'validToken' };
    const studentId = 'student-123';
    const mockClass = { id: 'class-xyz', classToken: 'validToken' };

    // Kasus normal: siswa berhasil bergabung ke kelas
    it('should allow a student to join a class successfully', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(mockClass);
      prisma.classEnrollment.findUnique.mockResolvedValue(null); // Siswa belum pernah join
      prisma.classEnrollment.create.mockResolvedValue({
        /* data enrollment */
      });

      // Act
      const result = await service.joinClass(dto, studentId);

      // Assert
      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { classToken: dto.classToken },
      });
      expect(prisma.classEnrollment.create).toHaveBeenCalledWith({
        data: { studentId, classId: mockClass.id },
      });
      expect(result).toEqual({
        message: 'Successfully joined class',
        class: mockClass,
      });
    });

    // Error handling: token kelas tidak ditemukan
    it('should throw NotFoundException if class token does not exist', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.joinClass(dto, studentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Error handling: siswa sudah pernah bergabung
    it('should throw ConflictException if student has already joined the class', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(mockClass);
      prisma.classEnrollment.findUnique.mockResolvedValue({
        /* data enrollment yang sudah ada */
      });

      // Act & Assert
      await expect(service.joinClass(dto, studentId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // Pengujian untuk method getClasses
  describe('getClasses', () => {
    const userId = 'user-123';

    // Kasus untuk instruktur
    it('should return classes created by the instructor', async () => {
      // Arrange
      const mockClasses = [{ id: 'class-1' }, { id: 'class-2' }];
      prisma.class.findMany.mockResolvedValue(mockClasses);

      // Act
      const result = await service.getClasses(userId, 'INSTRUCTOR');

      // Assert
      expect(prisma.class.findMany).toHaveBeenCalledWith({
        where: { instructorId: userId },
      });
      expect(result).toEqual(mockClasses);
    });

    // Kasus untuk siswa
    it('should return classes joined by the student', async () => {
      // Arrange
      const mockEnrollments = [
        { class: { id: 'class-A' } },
        { class: { id: 'class-B' } },
      ];
      prisma.classEnrollment.findMany.mockResolvedValue(mockEnrollments);

      // Act
      const result = await service.getClasses(userId, 'STUDENT');

      // Assert
      expect(prisma.classEnrollment.findMany).toHaveBeenCalledWith({
        where: { studentId: userId },
        include: { class: true },
      });
      expect(result).toEqual(mockEnrollments);
    });
  });

  // Pengujian untuk method getClassDetail
  describe('getClassDetail', () => {
    const classId = 'class-detail-id';
    const mockClassDetail = { id: classId, name: 'Detail Kelas' };

    // Kasus normal: berhasil mendapatkan detail kelas
    it('should return the class details if found', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(mockClassDetail);

      // Act
      const result = await service.getClassDetail(classId);

      // Assert
      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { id: classId },
        include: {
          instructor: true,
          enrollments: { include: { student: true } },
          assignments: true,
        },
      });
      expect(result).toEqual(mockClassDetail);
    });

    // Error handling: kelas tidak ditemukan
    it('should throw NotFoundException if class is not found', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getClassDetail(classId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
