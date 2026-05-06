import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async enableShutdownHooks(app: INestApplication) {
    // Hapus event 'beforeExit' jika error, atau update Prisma ke versi terbaru.
    // Jika ingin tetap menggunakan, pastikan versi Prisma minimal 4.x
    // Atau cukup gunakan onModuleDestroy jika ingin shutdown hook.
  }
}
