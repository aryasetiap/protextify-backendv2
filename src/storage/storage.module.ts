import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { StorageScheduler } from './storage.scheduler';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageScheduler, CloudStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
