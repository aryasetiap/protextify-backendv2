import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import * as path from 'path';

@ApiTags('storage')
@Controller('storage') // This becomes /api/storage due to global prefix
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Get('health')
  @ApiOperation({ summary: 'Storage service health check' })
  @ApiResponse({ status: 200, description: 'Storage service is healthy' })
  async healthCheck() {
    const uploadsPath = path.join(process.cwd(), 'uploads', 'submissions');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'storage',
      uploadsPath,
      endpoints: {
        health: '/api/storage/health',
        download: '/api/storage/download/:filename',
      },
    };
  }

  @Get('download/:filename')
  @ApiOperation({
    summary: 'Download generated file',
    description: 'Download PDF or DOCX file that was previously generated',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[STORAGE] Download request for: ${filename}`);

    // Basic security: validate filename
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      this.logger.error(`[STORAGE] Invalid filename: ${filename}`);
      throw new BadRequestException('Invalid filename');
    }

    try {
      const { filePath, mimeType } =
        await this.storageService.downloadFile(filename);

      this.logger.log(`[STORAGE] Serving file: ${filePath}`);

      // Set appropriate headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Cache-Control', 'private, no-cache');

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      this.logger.error(`[STORAGE] Download error:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Unable to download file');
    }
  }
}
