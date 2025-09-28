import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from './storage.service';

@Injectable()
export class StorageScheduler {
  private readonly logger = new Logger(StorageScheduler.name);

  constructor(private readonly storageService: StorageService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleFileCleanup() {
    this.logger.log('Starting scheduled cloud file cleanup...');

    try {
      const deletedCount = await this.storageService.cleanupOldFiles(7); // 7 days
      this.logger.log(
        `Cleanup completed: ${deletedCount} files deleted from cloud storage`,
      );
    } catch (error) {
      this.logger.error('Cloud file cleanup failed:', error);
    }
  }
}
