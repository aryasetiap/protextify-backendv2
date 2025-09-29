import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-token-123'),
}));

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: ClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: {
            createClass: jest.fn(),
            joinClass: jest.fn(),
            getClasses: jest.fn(),
            getClassDetail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get<ClassesService>(ClassesService);
  });

  it('should call createClass', async () => {
    (service.createClass as jest.Mock).mockResolvedValue({
      id: 'c1',
      name: 'Test',
    });
    const req = { user: { userId: 'instructorId' } };
    const dto = { name: 'Test', description: 'desc' };
    const result = await controller.createClass(req, dto as any);
    expect(service.createClass).toHaveBeenCalledWith(dto, 'instructorId');
    expect(result.id).toBe('c1');
  });

  it('should call joinClass', async () => {
    (service.joinClass as jest.Mock).mockResolvedValue({
      message: 'Successfully joined class',
      class: { id: 'c2' },
    });
    const req = { user: { userId: 'studentId' } };
    const dto = { classToken: 'token' };
    const result = await controller.joinClass(req, dto as any);
    expect(service.joinClass).toHaveBeenCalledWith(dto, 'studentId');
    expect(result.message).toBe('Successfully joined class');
  });

  it('should call getClasses', async () => {
    (service.getClasses as jest.Mock).mockResolvedValue([{ id: 'c3' }]);
    const req = { user: { userId: 'userId', role: 'INSTRUCTOR' } };
    const result = await controller.getClasses(req);
    expect(service.getClasses).toHaveBeenCalledWith('userId', 'INSTRUCTOR');
    expect(result).toEqual([{ id: 'c3' }]);
  });

  it('should call getClassDetail', async () => {
    (service.getClassDetail as jest.Mock).mockResolvedValue({ id: 'c4' });
    const result = await controller.getClassDetail('c4');
    expect(service.getClassDetail).toHaveBeenCalledWith('c4');
    expect(result.id).toBe('c4');
  });
});
