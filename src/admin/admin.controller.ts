import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { GetAdminAnalyticsDto } from './dto/get-admin-analytics.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Get admin dashboard overview',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard overview retrieved successfully',
  })
  getOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('dashboard/charts')
  @ApiOperation({
    summary: 'Get admin dashboard charts',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard chart data retrieved successfully',
  })
  getCharts(@Query() query: GetAdminAnalyticsDto) {
    return this.adminService.getDashboardCharts(query.range || '30d');
  }
}
