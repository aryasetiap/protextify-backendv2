import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@ApiTags('storage')
@Controller('storage') // This becomes /api/storage due to global prefix
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly cloudStorageProvider: CloudStorageProvider,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Storage service health check' })
  @ApiResponse({ status: 200, description: 'Storage service is healthy' })
  async healthCheck() {
    return this.storageService.healthCheck();
  }

  @Get('refresh-url/:cloudKey')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Refresh pre-signed URL for existing file',
    description: 'Generate new pre-signed URL for cloud storage file',
  })
  @ApiQuery({
    name: 'filename',
    required: true,
    description: 'Original filename for download',
  })
  @ApiQuery({
    name: 'expires',
    required: false,
    description: 'URL expiration time in seconds (default: 3600)',
  })
  @ApiResponse({
    status: 200,
    description: 'New pre-signed URL generated',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresIn: { type: 'number' },
        expiresAt: { type: 'string' },
      },
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
}
