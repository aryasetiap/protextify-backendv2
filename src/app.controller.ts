import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller() // This will be affected by global prefix → /api
@ApiExcludeController() // Hide from Swagger since we have dedicated controllers
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Add a health check endpoint under /api
  @Get('health-check')
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'protextify-backend-app',
      version: '2.0.0',
    };
  }
}
