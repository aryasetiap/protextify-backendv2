import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let service: AssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: {
            createAssignment: jest.fn(),
            getAssignments: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('createAssignment', () => {
    it('should call service and return result', async () => {
      const dto = { expectedStudentCount: 1, title: 'A' };
      const req = { user: { userId: 'instructorId' } };
      (service.createAssignment as jest.Mock).mockResolvedValue({
        assignment: { id: 'a1' },
      });
      const result = await controller.createAssignment(
        'classId',
        req,
        dto as any,
      );
      expect(service.createAssignment).toHaveBeenCalledWith(
        'classId',
        dto,
        'instructorId',
      );
      expect(result.assignment.id).toBe('a1');
    });
  });

  describe('getAssignments', () => {
    it('should call service and return assignments', async () => {
      const req = { user: { userId: 'userId', role: 'INSTRUCTOR' } };
      (service.getAssignments as jest.Mock).mockResolvedValue([{ id: 'a2' }]);
      const result = await controller.getAssignments('classId', req);
      expect(service.getAssignments).toHaveBeenCalledWith(
        'classId',
        'userId',
        'INSTRUCTOR',
      );
      expect(result).toEqual([{ id: 'a2' }]);
    });
  });
});
