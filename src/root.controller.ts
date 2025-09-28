import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller() // No prefix - handles root routes
@ApiExcludeController() // Exclude from Swagger
export class RootController {
  @Get()
  getRoot() {
    return {
      message: 'Welcome to Protextify Backend API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend',
      description:
        'Backend API untuk platform deteksi plagiarisme dan manajemen tugas',
      endpoints: {
        root: {
          url: '/',
          description: 'Welcome message',
        },
        api: {
          url: '/api',
          description: 'API endpoints information',
        },
        docs: {
          url: '/api/docs',
          description: 'Swagger API Documentation',
        },
        health: {
          url: '/health',
          description: 'Root health check',
        },
        apiHealth: {
          url: '/api/health',
          description: 'API health check with detailed info',
        },
        storage: {
          url: '/api/storage',
          description: 'File storage endpoints',
        },
      },
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('health')
  getHealth() {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend',
      version: '2.0.0',
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
