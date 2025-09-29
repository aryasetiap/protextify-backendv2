import { CloudStorageProvider } from './cloud-storage.provider';

// Mock getSignedUrl di level global
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('http://signed-url'),
}));

describe('CloudStorageProvider', () => {
  let provider: CloudStorageProvider;
  let config: any;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'CLOUDFLARE_R2_REGION':
            return 'auto';
          case 'CLOUDFLARE_R2_ENDPOINT':
            return 'http://r2';
          case 'CLOUDFLARE_R2_ACCESS_KEY_ID':
            return 'key';
          case 'CLOUDFLARE_R2_SECRET_ACCESS_KEY':
            return 'secret';
          case 'CLOUDFLARE_R2_BUCKET':
            return 'bucket';
          case 'CLOUDFLARE_R2_PUBLIC_URL':
            return 'http://public';
          default:
            return undefined;
        }
      }),
    };
    provider = new CloudStorageProvider(config);
  });

  it('should generate file key', () => {
    const key = provider.generateFileKey('submissions', 'file.pdf');
    expect(key).toMatch(/submissions\/\d{4}-\d{2}-\d{2}\/file\.pdf/);
  });

  it('should throw error if config missing', () => {
    expect(
      () =>
        new CloudStorageProvider({
          get: (k: string) =>
            k === 'CLOUDFLARE_R2_ENDPOINT' ? undefined : 'x',
        }),
    ).toThrow('CLOUDFLARE_R2_ENDPOINT is required');
  });

  it('should upload file and return result', async () => {
    provider['s3Client'].send = jest.fn().mockResolvedValue({});
    const result = await provider.uploadFile(
      Buffer.from('abc'),
      'key',
      'application/pdf',
      { meta: '1' },
    );
    expect(result.key).toBe('key');
    expect(result.size).toBe(3);
    expect(result.url).toBe('http://public/key');
  });

  it('should throw error on upload fail', async () => {
    provider['s3Client'].send = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(
      provider.uploadFile(Buffer.from('abc'), 'key', 'application/pdf'),
    ).rejects.toThrow('Failed to upload file to cloud storage');
  });

  it('should generate presigned url', async () => {
    provider['s3Client'].send = jest.fn().mockResolvedValue({});
    const url = await provider.generatePresignedUrl('key', {
      expiresIn: 3600,
      filename: 'file.pdf',
    });
    expect(url).toBe('http://signed-url');
  });

  it('should throw error on presigned url fail', async () => {
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    getSignedUrl.mockRejectedValueOnce(new Error('fail'));
    provider['s3Client'].send = jest.fn().mockResolvedValue({});

    await expect(provider.generatePresignedUrl('key')).rejects.toThrow(
      'Failed to generate download URL',
    );
  });

  it('should delete file', async () => {
    provider['s3Client'].send = jest.fn().mockResolvedValue({});
    await provider.deleteFile('key');
    expect(provider['s3Client'].send).toHaveBeenCalled();
  });

  it('should throw error on delete fail', async () => {
    provider['s3Client'].send = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(provider.deleteFile('key')).rejects.toThrow(
      'Failed to delete file from cloud storage',
    );
  });

  it('should health check and return healthy', async () => {
    provider['s3Client'].send = jest.fn().mockResolvedValue({});
    const result = await provider.healthCheck();
    expect(result.status).toBe('healthy');
    expect(result.bucket).toBe('bucket');
  });

  it('should throw error on health check fail', async () => {
    provider['s3Client'].send = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(provider.healthCheck()).rejects.toThrow(
      'Cloud storage health check failed: fail',
    );
  });
});
