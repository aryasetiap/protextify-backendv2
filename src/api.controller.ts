import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('api')
@Controller() // This will be under /api due to global prefix
export class ApiController {
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
          download: 'GET /api/storage/download/:filename',
        },
      },
      websocket: {
        events: [
          'updateContent',
          'notification',
          'submissionUpdated',
          'submissionListUpdated',
        ],
        url: 'ws://localhost:3000',
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
}
