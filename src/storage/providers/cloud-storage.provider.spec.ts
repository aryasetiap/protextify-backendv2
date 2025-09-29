import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CloudStorageProvider } from './cloud-storage.provider';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InternalServerErrorException } from '@nestjs/common';

// Mocking the S3Client and its methods
jest.mock('@aws-sdk/client-s3', () => {
  const mS3Client = {
    send: jest.fn(),
  };
  return {
    S3Client: jest.fn(() => mS3Client),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
  };
});

// Mocking the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('CloudStorageProvider', () => {
  let provider: CloudStorageProvider;
  let mockS3Client: S3Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudStorageProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                CLOUDFLARE_R2_ENDPOINT: 'http://localhost:9000',
                CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-key',
                CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret',
                CLOUDFLARE_R2_BUCKET: 'test-bucket',
                CLOUDFLARE_R2_PUBLIC_URL: 'http://public.url',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<CloudStorageProvider>(CloudStorageProvider);
    // S3Client is mocked, so we can access the mocked instance
    mockS3Client = new S3Client({});
    (mockS3Client.send as jest.Mock).mockClear();
    (getSignedUrl as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file and return the result', async () => {
      (mockS3Client.send as jest.Mock).mockResolvedValue({});
      const buffer = Buffer.from('test');
      const key = 'test-key';

      const result = await provider.uploadFile(buffer, key, 'text/plain');

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result.key).toBe(key);
      expect(result.size).toBe(buffer.length);
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate a presigned URL', async () => {
      const mockUrl = 'http://signed-url.com';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const url = await provider.generatePresignedUrl('test-key');

      expect(getSignedUrl).toHaveBeenCalled();
      expect(url).toBe(mockUrl);
    });
  });

  describe('deleteFile', () => {
    it('should call S3Client send to delete a file', async () => {
      (mockS3Client.send as jest.Mock).mockResolvedValue({});

      await provider.deleteFile('test-key-to-delete');

      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy on successful check', async () => {
      (mockS3Client.send as jest.Mock).mockResolvedValue({});
      const result = await provider.healthCheck();
      expect(result.status).toBe('healthy');
    });

    it('should throw an exception on failed check', async () => {
      (mockS3Client.send as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );
      await expect(provider.healthCheck()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
