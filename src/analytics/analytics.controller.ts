import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { GetAnalyticsDto } from './dto/get-analytics.dto';

@ApiTags('instructor-analytics')
@ApiBearerAuth()
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get instructor dashboard overview data',
    description:
      'Provides a comprehensive overview for the main instructor dashboard, including stats, recent activities, and chart data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDashboard(@Req() req) {
    return this.analyticsService.getInstructorDashboard(req.user.userId);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get instructor analytics data',
    description: 'Provides aggregated statistics for the instructor dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAnalytics(@Req() req, @Query() query: GetAnalyticsDto) {
    return this.analyticsService.getInstructorAnalytics(
      req.user.userId,
      query.range,
    );
  }
}
