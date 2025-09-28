import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { StorageScheduler } from './storage.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [StorageController],
  providers: [StorageService, CloudStorageProvider, StorageScheduler],
  exports: [StorageService, CloudStorageProvider],
})
export class StorageModule {}
