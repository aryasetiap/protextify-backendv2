import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    // Create a real instance of PrismaService
    service = new PrismaService();

    // Mock the methods we need
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.enableShutdownHooks = jest.fn();
  });

  it('should call $connect on onModuleInit', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('should have enableShutdownHooks method', () => {
    expect(typeof service.enableShutdownHooks).toBe('function');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
