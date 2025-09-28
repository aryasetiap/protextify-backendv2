import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command, // 🔧 Add this import
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface CloudUploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
}

export interface PreSignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  filename?: string;
}

@Injectable()
export class CloudStorageProvider {
  private readonly logger = new Logger(CloudStorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    // 🔧 Get and validate required config values
    const region =
      this.configService.get<string>('CLOUDFLARE_R2_REGION') || 'auto';
    const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>(
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.configService.get<string>(
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET');
    const publicUrl = this.configService.get<string>(
      'CLOUDFLARE_R2_PUBLIC_URL',
    );

    // 🔧 Validate required configuration
    if (!endpoint) {
      throw new Error('CLOUDFLARE_R2_ENDPOINT is required');
    }
    if (!accessKeyId) {
      throw new Error('CLOUDFLARE_R2_ACCESS_KEY_ID is required');
    }
    if (!secretAccessKey) {
      throw new Error('CLOUDFLARE_R2_SECRET_ACCESS_KEY is required');
    }
    if (!bucket) {
      throw new Error('CLOUDFLARE_R2_BUCKET is required');
    }
    if (!publicUrl) {
      throw new Error('CLOUDFLARE_R2_PUBLIC_URL is required');
    }

    // Initialize Cloudflare R2 client (compatible with AWS S3 SDK)
    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // 🔧 Add additional configuration for Cloudflare R2
      forcePathStyle: true, // Important for R2 compatibility
    });

    this.bucket = bucket;
    this.publicUrl = publicUrl;

    this.logger.log(`[CLOUD STORAGE] Initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload file buffer to Cloudflare R2
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<CloudUploadResult> {
    try {
      this.logger.log(`[CLOUD STORAGE] Uploading file: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      const result: CloudUploadResult = {
        key,
        url: `${this.publicUrl}/${key}`,
        publicUrl: `${this.publicUrl}/${key}`,
        size: buffer.length,
      };

      this.logger.log(`[CLOUD STORAGE] File uploaded successfully: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`[CLOUD STORAGE] Upload failed for key: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to upload file to cloud storage',
      );
    }
  }

  /**
   * Generate pre-signed URL for secure download
   */
  async generatePresignedUrl(
    key: string,
    options: PreSignedUrlOptions = {},
  ): Promise<string> {
    try {
      const { expiresIn = 3600, filename } = options;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(filename && {
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(
        `[CLOUD STORAGE] Generated presigned URL for: ${key}, expires in ${expiresIn}s`,
      );
      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `[CLOUD STORAGE] Failed to generate presigned URL for: ${key}`,
        error,
      );
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`[CLOUD STORAGE] File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`[CLOUD STORAGE] Failed to delete file: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to delete file from cloud storage',
      );
    }
  }

  /**
   * Generate cloud storage key for files
   */
  generateFileKey(prefix: string, filename: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${prefix}/${timestamp}/${filename}`;
  }

  /**
   * Health check for cloud storage connection - FIXED
   */
  async healthCheck(): Promise<{
    status: string;
    bucket: string;
    endpoint: string;
  }> {
    try {
      const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      if (!endpoint) {
        throw new Error('CLOUDFLARE_R2_ENDPOINT is not configured');
      }

      // 🔧 Use ListObjectsV2Command instead of GetObjectCommand for health check
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1, // Only get 1 object to minimize cost/time
      });

      // This will succeed even if bucket is empty
      await this.s3Client.send(command);

      this.logger.log('[CLOUD STORAGE] Health check passed');
      return {
        status: 'healthy',
        bucket: this.bucket,
        endpoint,
      };
    } catch (error) {
      this.logger.error('[CLOUD STORAGE] Health check failed:', error);

      // 🔧 More detailed error logging
      if (error.name === 'CredentialsError') {
        throw new InternalServerErrorException(
          'Invalid Cloudflare R2 credentials',
        );
      } else if (error.name === 'NetworkError') {
        throw new InternalServerErrorException(
          'Network error connecting to Cloudflare R2',
        );
      } else if (error.name === 'NoSuchBucket') {
        throw new InternalServerErrorException(
          `Bucket '${this.bucket}' does not exist`,
        );
      }

      throw new InternalServerErrorException(
        `Cloud storage health check failed: ${error.message}`,
      );
    }
  }
}
