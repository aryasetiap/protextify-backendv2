import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let service: SubmissionsService;

  // Mock object untuk SubmissionsService
  const mockSubmissionsService = {
    createSubmission: jest.fn(),
    getStudentHistory: jest.fn(),
    getClassHistory: jest.fn(),
    downloadSubmission: jest.fn(),
    getSubmissionDetail: jest.fn(),
    updateContent: jest.fn(),
    submit: jest.fn(),
    grade: jest.fn(),
    getSubmissionsForAssignment: jest.fn(),
  };

  // Mock data request object
  const mockRequest = {
    user: {
      userId: 'user-1',
      role: 'STUDENT',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: mockSubmissionsService,
        },
      ],
    })
      // Mock Guards agar tidak mengganggu unit test controller
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
    service = module.get<SubmissionsService>(SubmissionsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Menguji endpoint POST /assignments/:assignmentId/submissions
  it('should call createSubmission on the service', async () => {
    const assignmentId = 'assignment-1';
    const dto = { content: 'test content' };
    const expectedResult = { id: 'submission-1', ...dto };
    jest
      .spyOn(service, 'createSubmission')
      .mockResolvedValue(expectedResult as any);

    const result = await controller.createSubmission(
      assignmentId,
      mockRequest,
      dto,
    );

    expect(service.createSubmission).toHaveBeenCalledWith(
      assignmentId,
      dto,
      mockRequest.user.userId,
    );
    expect(result).toEqual(expectedResult);
  });

  // Menguji endpoint GET /submissions/history
  it('should call getStudentHistory on the service', async () => {
    await controller.getStudentHistory(mockRequest);
    expect(service.getStudentHistory).toHaveBeenCalledWith(
      mockRequest.user.userId,
    );
  });

  // Menguji endpoint GET /submissions/:id/download
  it('should call downloadSubmission on the service with correct format', async () => {
    const submissionId = 'sub-1';
    const format = 'pdf';
    await controller.downloadSubmission(submissionId, mockRequest, format);

    expect(service.downloadSubmission).toHaveBeenCalledWith(
      submissionId,
      mockRequest.user.userId,
      mockRequest.user.role,
      format,
    );
  });

  // Menguji endpoint GET /submissions/:id
  it('should call getSubmissionDetail on the service', async () => {
    const submissionId = 'sub-1';
    await controller.getSubmissionDetail(submissionId, mockRequest);

    expect(service.getSubmissionDetail).toHaveBeenCalledWith(
      submissionId,
      mockRequest.user.userId,
      mockRequest.user.role,
    );
  });

  // Menguji endpoint PATCH /submissions/:id/grade
  it('should call grade on the service', async () => {
    const submissionId = 'sub-1';
    const grade = 90;
    const instructorRequest = {
      user: { userId: 'instructor-1', role: 'INSTRUCTOR' },
    };

    await controller.grade(submissionId, instructorRequest, grade);

    expect(service.grade).toHaveBeenCalledWith(
      submissionId,
      grade,
      instructorRequest.user.userId,
    );
  });
});
