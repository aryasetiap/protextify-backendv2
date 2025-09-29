import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// Mockup untuk ClassesService
const mockClassesService = {
  createClass: jest.fn(),
  joinClass: jest.fn(),
  getClasses: jest.fn(),
  getClassDetail: jest.fn(),
};

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: typeof mockClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: mockClassesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Bypass guard untuk unit test
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true }) // Bypass guard untuk unit test
      .compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get(ClassesService);

    // Reset semua mock sebelum setiap test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Pengujian untuk endpoint POST /classes
  describe('createClass', () => {
    it('should call service.createClass with correct parameters', async () => {
      // Arrange
      const dto: CreateClassDto = { name: 'Kelas Controller' };
      const req = { user: { userId: 'instructor-123' } };
      const mockResult = { id: 'class-1', ...dto };
      service.createClass.mockResolvedValue(mockResult);

      // Act
      const result = await controller.createClass(req, dto);

      // Assert
      expect(service.createClass).toHaveBeenCalledWith(dto, req.user.userId);
      expect(result).toEqual(mockResult);
    });
  });

  // Pengujian untuk endpoint POST /classes/join
  describe('joinClass', () => {
    it('should call service.joinClass with correct parameters', async () => {
      // Arrange
      const dto: JoinClassDto = { classToken: 'token-xyz' };
      const req = { user: { userId: 'student-123' } };
      const mockResult = { message: 'Successfully joined class' };
      service.joinClass.mockResolvedValue(mockResult);

      // Act
      const result = await controller.joinClass(req, dto);

      // Assert
      expect(service.joinClass).toHaveBeenCalledWith(dto, req.user.userId);
      expect(result).toEqual(mockResult);
    });
  });

  // Pengujian untuk endpoint GET /classes
  describe('getClasses', () => {
    it('should call service.getClasses with user details', async () => {
      // Arrange
      const req = { user: { userId: 'user-abc', role: 'STUDENT' } };
      const mockResult = [{ id: 'class-1' }];
      service.getClasses.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getClasses(req);

      // Assert
      expect(service.getClasses).toHaveBeenCalledWith(
        req.user.userId,
        req.user.role,
      );
      expect(result).toEqual(mockResult);
    });
  });

  // Pengujian untuk endpoint GET /classes/:id
  describe('getClassDetail', () => {
    it('should call service.getClassDetail with the correct id', async () => {
      // Arrange
      const classId = 'class-xyz';
      const mockResult = { id: classId, name: 'Detail Kelas' };
      service.getClassDetail.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getClassDetail(classId);

      // Assert
      expect(service.getClassDetail).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockResult);
    });
  });
});
