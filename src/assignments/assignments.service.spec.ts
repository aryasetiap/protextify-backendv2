import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

// Mockup untuk PrismaService
const mockPrismaService = {
  class: {
    findUnique: jest.fn(),
  },
  assignment: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    prisma = module.get(PrismaService);

    // Reset semua mock sebelum setiap test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Pengujian untuk method createAssignment
  describe('createAssignment', () => {
    const classId = 'class-123';
    const instructorId = 'instructor-abc';
    const dto: CreateAssignmentDto = {
      title: 'Tugas Kalkulus',
      instructions: 'Kerjakan soal halaman 50.',
      expectedStudentCount: 10,
      deadline: '2025-12-31T23:59:59Z',
    };
    const mockClass = { id: classId, instructorId: instructorId };
    const mockAssignment = {
      id: 'assignment-xyz',
      ...dto,
      classId,
      active: false,
      deadline: new Date(dto.deadline),
    };

    // Kasus normal: berhasil membuat assignment
    it('should create and return an assignment with payment details', async () => {
      // Arrange: siapkan mock data
      prisma.class.findUnique.mockResolvedValue(mockClass);
      prisma.assignment.create.mockResolvedValue(mockAssignment);

      const pricePerStudent = 2500;
      const totalPrice = dto.expectedStudentCount * pricePerStudent;

      // Act: panggil method yang akan diuji
      const result = await service.createAssignment(classId, dto, instructorId);

      // Assert: pastikan hasilnya sesuai ekspektasi
      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { id: classId },
        include: { enrollments: true },
      });
      expect(prisma.assignment.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          instructions: dto.instructions,
          deadline: new Date(dto.deadline),
          classId,
          expectedStudentCount: dto.expectedStudentCount,
          active: false,
        },
      });
      expect(result).toEqual({
        assignment: mockAssignment,
        paymentRequired: true,
        totalPrice,
        pricePerStudent,
        expectedStudentCount: dto.expectedStudentCount,
        message: 'Assignment created. Please complete payment to activate.',
        paymentData: {
          amount: totalPrice,
          assignmentId: mockAssignment.id,
        },
      });
    });

    // Error handling: kelas tidak ditemukan
    it('should throw NotFoundException if class is not found', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createAssignment(classId, dto, instructorId),
      ).rejects.toThrow(NotFoundException);
    });

    // Error handling: instruktur mencoba membuat assignment di kelas orang lain
    it('should throw ForbiddenException if instructor does not own the class', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue({
        ...mockClass,
        instructorId: 'another-instructor',
      });

      // Act & Assert
      await expect(
        service.createAssignment(classId, dto, instructorId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Pengujian untuk method getAssignments
  describe('getAssignments', () => {
    const classId = 'class-123';
    const mockClass = { id: classId, instructorId: 'instructor-abc' };
    const mockAssignments = [
      { id: 'asg-1', title: 'Tugas 1', active: true, submissions: [] },
      { id: 'asg-2', title: 'Tugas 2', active: false, submissions: [] },
    ];

    // Kasus normal: instruktur mengambil semua assignment di kelasnya
    it('should return all assignments for the class instructor', async () => {
      // Arrange
      const instructorId = 'instructor-abc';
      prisma.class.findUnique.mockResolvedValue(mockClass);
      prisma.assignment.findMany.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.getAssignments(
        classId,
        instructorId,
        'INSTRUCTOR',
      );

      // Assert
      expect(prisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId },
        }),
      );
      expect(result).toEqual(mockAssignments);
    });

    // Kasus normal: siswa hanya mengambil assignment yang aktif
    it('should return only active assignments for a student', async () => {
      // Arrange
      const studentId = 'student-xyz';
      const activeAssignments = mockAssignments.filter((a) => a.active);
      prisma.class.findUnique.mockResolvedValue(mockClass);
      prisma.assignment.findMany.mockResolvedValue(activeAssignments);

      // Act
      const result = await service.getAssignments(
        classId,
        studentId,
        'STUDENT',
      );

      // Assert
      expect(prisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId, active: true },
          include: expect.objectContaining({
            submissions: { where: { studentId } },
          }),
        }),
      );
      expect(result).toEqual(activeAssignments);
    });

    // Error handling: kelas tidak ditemukan
    it('should throw NotFoundException if class is not found', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getAssignments(classId, 'any-user', 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });

    // Error handling: instruktur mencoba mengakses assignment di kelas orang lain
    it('should throw ForbiddenException if an instructor tries to access another instructor class', async () => {
      // Arrange
      prisma.class.findUnique.mockResolvedValue(mockClass);

      // Act & Assert
      await expect(
        service.getAssignments(classId, 'another-instructor', 'INSTRUCTOR'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
