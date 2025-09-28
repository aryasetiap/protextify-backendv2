import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module'; // 🆕 Import StorageModule

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    StorageModule, // 🆕 Add StorageModule
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
