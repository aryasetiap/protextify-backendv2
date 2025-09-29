import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

// Mock dependensi
const mockStorageService = {
  healthCheck: jest.fn(),
  refreshDownloadUrl: jest.fn(),
};

// CloudStorageProvider ada di constructor controller, jadi kita mock juga
const mockCloudStorageProvider = {};

describe('StorageController', () => {
  let controller: StorageController;
  let service: typeof mockStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: CloudStorageProvider, useValue: mockCloudStorageProvider },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
    service = module.get(StorageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should call and return the result from storageService.healthCheck', async () => {
      const healthStatus = { status: 'healthy' };
      service.healthCheck.mockResolvedValue(healthStatus);

      const result = await controller.healthCheck();

      expect(service.healthCheck).toHaveBeenCalled();
      expect(result).toBe(healthStatus);
    });
  });

  describe('refreshDownloadUrl', () => {
    const cloudKey = 'path/to/file.pdf';
    const filename = 'file.pdf';

    it('should call service with correct parameters and return url', async () => {
      const newUrl = 'http://new-presigned-url.com';
      service.refreshDownloadUrl.mockResolvedValue(newUrl);

      const result = await controller.refreshDownloadUrl(
        cloudKey,
        filename,
        '7200',
      );

      expect(service.refreshDownloadUrl).toHaveBeenCalledWith(
        cloudKey,
        filename,
        7200,
      );
      expect(result.url).toBe(newUrl);
      expect(result.expiresIn).toBe(7200);
    });

    it('should use default expiration if not provided', async () => {
      service.refreshDownloadUrl.mockResolvedValue('http://default-url.com');
      await controller.refreshDownloadUrl(cloudKey, filename, undefined);
      expect(service.refreshDownloadUrl).toHaveBeenCalledWith(
        cloudKey,
        filename,
        3600,
      );
    });

    it('should throw BadRequestException for invalid cloudKey', async () => {
      await expect(
        controller.refreshDownloadUrl('../invalid-key', filename, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid expiration time', async () => {
      await expect(
        controller.refreshDownloadUrl(cloudKey, filename, '10'),
      ).rejects.toThrow(BadRequestException); // too short
      await expect(
        controller.refreshDownloadUrl(cloudKey, filename, '90000'),
      ).rejects.toThrow(BadRequestException); // too long
    });
  });
});
