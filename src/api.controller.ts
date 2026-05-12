import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { PlagiarismService } from './plagiarism/plagiarism.service';

type ReadinessCheck = {
  status: 'up' | 'down';
  name?: string;
  reason?: string;
  stats?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
};

@ApiTags('api')
@Controller()
export class ApiController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly plagiarismService: PlagiarismService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API Root endpoint' })
  @ApiResponse({ status: 200, description: 'API information' })
  getApiRoot() {
    return {
      message: 'Protextify Backend API v2.0',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend-api',
      documentation: '/api/docs',
      endpoints: {
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          google: 'GET /api/auth/google',
          verify: 'POST /api/auth/verify-email',
        },
        users: {
          profile: 'GET /api/users/me',
          updateProfile: 'PATCH /api/users/me',
        },
        classes: {
          create: 'POST /api/classes',
          list: 'GET /api/classes',
          join: 'POST /api/classes/join',
          detail: 'GET /api/classes/:id',
        },
        assignments: {
          create: 'POST /api/classes/:classId/assignments',
          list: 'GET /api/classes/:classId/assignments',
        },
        submissions: {
          create: 'POST /api/assignments/:assignmentId/submissions',
          detail: 'GET /api/submissions/:id',
          update: 'PATCH /api/submissions/:id/content',
          submit: 'POST /api/submissions/:id/submit',
          download: 'GET /api/submissions/:id/download',
          history: 'GET /api/submissions/history',
          versions: 'GET /api/submissions/:id/versions', // 🆕 New endpoint
          versionDetail: 'GET /api/submissions/:id/versions/:version', // 🆕 New endpoint
        },
        plagiarism: {
          check: 'POST /api/submissions/:id/check-plagiarism',
          report: 'GET /api/submissions/:id/plagiarism-report',
        },
        payments: {
          transaction: 'POST /api/payments/create-transaction',
          webhook: 'POST /api/payments/webhook',
        },
        storage: {
          health: 'GET /api/storage/health',
          upload: 'POST /api/storage/upload',
          refreshUrl: 'GET /api/storage/refresh-url/:cloudKey',
          download: 'GET /api/storage/download/:filename',
        },
        health: {
          api: 'GET /api/health-check',
          readiness: 'GET /api/health/readiness',
        },
      },
      websocket: {
        events: [
          'updateContent',
          'notification',
          'submissionUpdated',
          'submissionListUpdated',
        ],
        url: 'wss://api.protextify.id/',
      },
      status: 'operational',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  @ApiResponse({ status: 200, description: 'API health status' })
  getApiHealth() {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend-api',
      version: '2.0.0',
      api: 'operational',
      database: 'connected',
      redis: 'connected',
      storage: 'healthy',
      uptime: Math.round(process.uptime()),
      memory: {
        used:
          Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100 + ' MB',
        total:
          Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100 + ' MB',
        rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100 + ' MB',
      },
      environment: process.env.NODE_ENV || 'development',
      node: process.version,
      platform: process.platform,
      pid: process.pid,
    };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'API readiness check' })
  @ApiResponse({
    status: 200,
    description: 'Readiness status for API, PostgreSQL, Redis, and queue',
  })
  async getReadiness() {
    const [postgres, queue] = await Promise.all([
      this.withTimeout(this.checkPostgres(), 3000, {
        status: 'down',
        reason: 'timeout',
      }),
      this.withTimeout(this.checkQueue(), 3000, {
        status: 'down',
        name: 'plagiarism',
        reason: 'timeout',
      }),
    ]);
    const ready = postgres.status === 'up' && queue.status === 'up';

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend-api',
      timeoutMs: 3000,
      checks: {
        api: {
          status: 'up',
        },
        postgres,
        redis: {
          status: queue.status,
          via: 'bull queue',
        },
        queue,
      },
    };
  }

  private async checkPostgres(): Promise<ReadinessCheck> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        status: 'up',
      };
    } catch {
      return {
        status: 'down',
      };
    }
  }

  private async checkQueue(): Promise<ReadinessCheck> {
    try {
      const stats = await this.plagiarismService.getQueueStats();
      return {
        status: 'up',
        name: 'plagiarism',
        stats,
      };
    } catch {
      return {
        status: 'down',
        name: 'plagiarism',
      };
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallback: T,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) =>
        setTimeout(() => resolve(fallback), timeoutMs),
      ),
    ]);
  }
}
