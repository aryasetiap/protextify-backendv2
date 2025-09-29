import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismController } from './plagiarism.controller';
import { PlagiarismService } from './plagiarism.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckPlagiarismDto } from './dto';
import { BadRequestException } from '@nestjs/common';

// Mock untuk PlagiarismService
const mockPlagiarismService = {
  checkPlagiarism: jest.fn(),
  getPlagiarismResult: jest.fn(),
  getQueueStats: jest.fn(),
};

describe('PlagiarismController', () => {
  let controller: PlagiarismController;
  let service: typeof mockPlagiarismService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlagiarismController],
      providers: [
        {
          provide: PlagiarismService,
          useValue: mockPlagiarismService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlagiarismController>(PlagiarismController);
    service = module.get(PlagiarismService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkPlagiarism', () => {
    const submissionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const invalidId = 'invalid-id';
    const dto: CheckPlagiarismDto = {};
    const req = { user: { userId: 'instructor-123' } };

    it('should call service.checkPlagiarism with correct parameters', async () => {
      const mockResult = { jobId: '1', status: 'queued' };
      service.checkPlagiarism.mockResolvedValue(mockResult as any);

      const result = await controller.checkPlagiarism(submissionId, dto, req);

      expect(service.checkPlagiarism).toHaveBeenCalledWith(
        submissionId,
        dto,
        req.user.userId,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException for invalid submission ID format', async () => {
      await expect(
        controller.checkPlagiarism(invalidId, dto, req),
      ).rejects.toThrow(BadRequestException);
      expect(service.checkPlagiarism).not.toHaveBeenCalled();
    });
  });

  describe('getPlagiarismReport', () => {
    const submissionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const invalidId = 'invalid-id';
    const req = { user: { userId: 'user-123', role: 'STUDENT' } };

    it('should call service.getPlagiarismResult with correct parameters', async () => {
      const mockResult = { status: 'completed', score: 10 };
      service.getPlagiarismResult.mockResolvedValue(mockResult);

      const result = await controller.getPlagiarismReport(submissionId, req);

      expect(service.getPlagiarismResult).toHaveBeenCalledWith(
        submissionId,
        req.user.userId,
        req.user.role,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException for invalid submission ID format', async () => {
      await expect(
        controller.getPlagiarismReport(invalidId, req),
      ).rejects.toThrow(BadRequestException);
      expect(service.getPlagiarismResult).not.toHaveBeenCalled();
    });
  });

  describe('getQueueStats', () => {
    it('should call service.getQueueStats', async () => {
      const mockStats = {
        waiting: 1,
        active: 0,
        completed: 5,
        failed: 0,
        total: 6,
      };
      service.getQueueStats.mockResolvedValue(mockStats);

      const result = await controller.getQueueStats();

      expect(service.getQueueStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});
