import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { UploadFileDto, UploadResponseDto } from './dto/upload-file.dto';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage') // This becomes /api/storage due to global prefix
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly cloudStorageProvider: CloudStorageProvider,
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Storage service health check',
    description: 'Check health status of storage service and cloud provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage service is healthy',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2025-06-01T12:00:00.000Z',
        service: 'storage',
        cloudStorage: {
          status: 'healthy',
          bucket: 'protextify-files',
          endpoint: 'https://r2.cloudflare.com',
        },
        features: {
          pdfGeneration: 'enabled',
          docxGeneration: 'enabled',
          cloudUpload: 'enabled',
          presignedUrls: 'enabled',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service is unhealthy',
    schema: {
      example: {
        status: 'unhealthy',
        timestamp: '2025-06-01T12:00:00.000Z',
        service: 'storage',
        error: 'Connection failed',
      },
    },
  })
  async healthCheck() {
    return this.storageService.healthCheck();
  }

  @Get('refresh-url/:cloudKey')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Refresh pre-signed URL for existing file',
    description:
      'Generate new pre-signed URL for cloud storage file. Requires authentication.',
  })
  @ApiParam({
    name: 'cloudKey',
    type: String,
    description: 'Cloud storage key (path) of the file',
    example: 'submissions/2025-06-01/submission-abc123.pdf',
  })
  @ApiQuery({
    name: 'filename',
    required: true,
    description: 'Original filename for download',
    example: 'submission-abc123.pdf',
  })
  @ApiQuery({
    name: 'expires',
    required: false,
    description:
      'URL expiration time in seconds (default: 3600, min: 60, max: 86400)',
    example: '7200',
  })
  @ApiResponse({
    status: 200,
    description: 'New pre-signed URL generated',
    schema: {
      example: {
        url: 'https://r2.cloudflare.com/presigned-url',
        expiresIn: 7200,
        expiresAt: '2025-06-01T14:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cloud key or expiration time',
    schema: {
      example: { statusCode: 400, message: 'Invalid cloud key' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: { statusCode: 401, message: 'Unauthorized' },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Unable to refresh download URL',
    schema: {
      example: { statusCode: 500, message: 'Unable to refresh download URL' },
    },
  })
  async refreshDownloadUrl(
    @Param('cloudKey') cloudKey: string,
    @Query('filename') filename: string,
    @Query('expires') expires?: string,
  ) {
    // Basic security: validate cloudKey
    if (!cloudKey || cloudKey.includes('..')) {
      throw new BadRequestException('Invalid cloud key');
    }

    const expiresIn = expires ? parseInt(expires, 10) : 3600;

    if (isNaN(expiresIn) || expiresIn < 60 || expiresIn > 86400) {
      throw new BadRequestException(
        'Expires time must be between 60 and 86400 seconds',
      );
    }

    try {
      const url = await this.storageService.refreshDownloadUrl(
        decodeURIComponent(cloudKey),
        filename,
        expiresIn,
      );

      return {
        url,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error) {
      this.logger.error(`[STORAGE] Refresh URL error:`, error);
      throw new BadRequestException('Unable to refresh download URL');
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload file attachment',
    description: 'Upload file attachment for assignments or submissions',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (PDF, DOC, DOCX, JPG, PNG, ZIP)',
        },
        assignmentId: {
          type: 'string',
          description: 'Assignment ID (optional)',
        },
        submissionId: {
          type: 'string',
          description: 'Submission ID (optional)',
        },
        description: {
          type: 'string',
          description: 'File description (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
    schema: {
      example: {
        id: 'file-abc123',
        filename: 'document.pdf',
        size: 1234567,
        mimeType: 'application/pdf',
        cloudKey: 'attachments/file-abc123.pdf',
        uploadedAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - File validation failed',
    schema: {
      examples: {
        unsupportedType: {
          value: {
            statusCode: 400,
            message:
              'Tipe file tidak didukung. Hanya PDF, DOC, DOCX, JPG, PNG, ZIP yang diperbolehkan.',
            error: 'Bad Request',
          },
        },
        fileTooLarge: {
          value: {
            statusCode: 400,
            message: 'Ukuran file terlalu besar. Maksimal 10MB.',
            error: 'Bad Request',
          },
        },
        noFile: {
          value: {
            statusCode: 400,
            message: 'No file provided',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: { statusCode: 401, message: 'Unauthorized' },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Req() req,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storageService.uploadFileAttachment(file, req.user.userId, dto);
  }
}
