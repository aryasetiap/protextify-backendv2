import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlagiarismService } from './plagiarism.service';
// 🔧 Perbaiki import DTO menggunakan index
import { CheckPlagiarismDto, PlagiarismResultDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('plagiarism')
@Controller()
@ApiBearerAuth()
export class PlagiarismController {
  constructor(private readonly plagiarismService: PlagiarismService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('/submissions/:id/check-plagiarism')
  @ApiOperation({
    summary: 'Trigger plagiarism check for submission (Instructor only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plagiarism check queued successfully',
    type: PlagiarismResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Submission not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your class' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid submission content',
  })
  async checkPlagiarism(
    @Param('id') submissionId: string,
    @Body() dto: CheckPlagiarismDto,
    @Req() req: any,
  ): Promise<PlagiarismResultDto> {
    return this.plagiarismService.checkPlagiarism(
      submissionId,
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/plagiarism-report')
  @ApiOperation({ summary: 'Get plagiarism check result' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plagiarism result retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Submission not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No access to this submission',
  })
  async getPlagiarismReport(
    @Param('id') submissionId: string,
    @Req() req: any,
  ) {
    return this.plagiarismService.getPlagiarismResult(
      submissionId,
      req.user.userId,
      req.user.role,
    );
  }

  // Admin endpoint untuk monitoring queue (optional)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/plagiarism/queue-stats')
  @ApiOperation({ summary: 'Get plagiarism queue statistics (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStats() {
    return this.plagiarismService.getQueueStats();
  }
}
