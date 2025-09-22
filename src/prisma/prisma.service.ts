import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
  async enableShutdownHooks(app: INestApplication) {
    // Hapus event 'beforeExit' jika error, atau update Prisma ke versi terbaru.
    // Jika ingin tetap menggunakan, pastikan versi Prisma minimal 4.x
    // Atau cukup gunakan onModuleDestroy jika ingin shutdown hook.
  }
}
