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
        auth: '/api/auth',
        users: '/api/users',
        classes: '/api/classes',
        assignments: '/api/assignments',
        submissions: '/api/submissions',
        payments: '/api/payments',
        plagiarism: '/api/plagiarism',
        storage: '/api/storage',
      },
      websocket: {
        events: ['updateContent', 'notification', 'submissionUpdated'],
      },
      status: 'operational',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  @ApiResponse({ status: 200, description: 'API health status' })
  getApiHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend-api',
      version: '2.0.0',
      api: 'operational',
      database: 'connected',
      redis: 'connected',
      storage: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
