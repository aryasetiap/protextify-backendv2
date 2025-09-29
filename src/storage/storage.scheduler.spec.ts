import { Test, TestingModule } from '@nestjs/testing';
import { StorageScheduler } from './storage.scheduler';
import { StorageService } from './storage.service';

// Mock untuk StorageService
const mockStorageService = {
  cleanupOldFiles: jest.fn(),
};

describe('StorageScheduler', () => {
  let scheduler: StorageScheduler;
  let service: typeof mockStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageScheduler,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    scheduler = module.get<StorageScheduler>(StorageScheduler);
    service = module.get(StorageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('handleFileCleanup', () => {
    it('should call storageService.cleanupOldFiles', async () => {
      // Atur mock untuk mengembalikan nilai agar tidak error
      service.cleanupOldFiles.mockResolvedValue(5);

      // Panggil method cron secara manual untuk testing
      await scheduler.handleFileCleanup();

      // Verifikasi bahwa service dipanggil
      expect(service.cleanupOldFiles).toHaveBeenCalledWith(7);
      expect(service.cleanupOldFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from the service gracefully', async () => {
      const error = new Error('Cleanup failed');
      service.cleanupOldFiles.mockRejectedValue(error);

      // Kita bisa mock Logger untuk memastikan error dicatat, tapi untuk sekarang cukup pastikan tidak crash
      // Logger.error akan dipanggil di implementasi aslinya
      await expect(scheduler.handleFileCleanup()).resolves.not.toThrow();

      expect(service.cleanupOldFiles).toHaveBeenCalledWith(7);
    });
  });
});
