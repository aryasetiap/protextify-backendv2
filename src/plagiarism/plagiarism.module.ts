import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlagiarismController } from './plagiarism.controller';
import { PlagiarismService } from './plagiarism.service';
import { PlagiarismProcessor } from './plagiarism.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    BullModule.registerQueue({
      name: 'plagiarism',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
  ],
  controllers: [PlagiarismController],
  providers: [PlagiarismService, PlagiarismProcessor],
  exports: [PlagiarismService],
})
export class PlagiarismModule {}
