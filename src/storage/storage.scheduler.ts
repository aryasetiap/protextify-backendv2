import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from './storage.service';

@Injectable()
export class StorageScheduler {
  private readonly logger = new Logger(StorageScheduler.name);

  constructor(private readonly storageService: StorageService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleFileCleanup() {
    this.logger.log('Starting scheduled file cleanup...');

    try {
      const deletedCount = await this.storageService.cleanupOldFiles(24);
      this.logger.log(`Cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      this.logger.error('File cleanup failed:', error);
    }
  }
}
