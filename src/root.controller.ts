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
      endpoints: {
        root: '/',
        api: '/api',
        docs: '/api/docs',
        health: '/health',
        apiHealth: '/api/health',
        storage: '/api/storage',
      },
      status: 'healthy',
      uptime: process.uptime(),
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend',
      version: '2.0.0',
      uptime: process.uptime(),
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100 +
          ' MB',
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
            100 +
          ' MB',
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
