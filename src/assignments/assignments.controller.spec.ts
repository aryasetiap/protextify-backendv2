import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// Mockup untuk AssignmentsService
const mockAssignmentsService = {
  createAssignment: jest.fn(),
  getAssignments: jest.fn(),
};

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let service: typeof mockAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: mockAssignmentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard) // Mengabaikan guard untuk unit test
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard) // Mengabaikan guard untuk unit test
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    service = module.get(AssignmentsService);

    // Reset semua mock sebelum setiap test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Pengujian untuk endpoint POST /classes/:classId/assignments
  describe('createAssignment', () => {
    it('should call service.createAssignment with correct parameters and return the result', async () => {
      // Arrange: siapkan data input dan mock
      const classId = 'class-123';
      const dto: CreateAssignmentDto = {
        title: 'New Assignment',
        expectedStudentCount: 15,
      };
      const mockRequest = {
        user: {
          userId: 'instructor-abc',
        },
      };
      const mockResult = { id: 'new-assignment-id', ...dto };
      service.createAssignment.mockResolvedValue(mockResult);

      // Act: panggil method controller
      const result = await controller.createAssignment(
        classId,
        mockRequest,
        dto,
      );

      // Assert: pastikan service dipanggil dengan benar dan hasilnya dikembalikan
      expect(service.createAssignment).toHaveBeenCalledWith(
        classId,
        dto,
        mockRequest.user.userId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  // Pengujian untuk endpoint GET /classes/:classId/assignments
  describe('getAssignments', () => {
    it('should call service.getAssignments with correct parameters and return the result', async () => {
      // Arrange
      const classId = 'class-123';
      const mockRequest = {
        user: {
          userId: 'user-xyz',
          role: 'STUDENT',
        },
      };
      const mockResult = [{ id: 'asg-1', title: 'Tugas 1' }];
      service.getAssignments.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getAssignments(classId, mockRequest);

      // Assert
      expect(service.getAssignments).toHaveBeenCalledWith(
        classId,
        mockRequest.user.userId,
        mockRequest.user.role,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
