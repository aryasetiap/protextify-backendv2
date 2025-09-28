import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlagiarismService } from './plagiarism.service';
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
    // 🔧 Add validation for UUID format
    if (
      !submissionId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    ) {
      throw new BadRequestException('Invalid submission ID format');
    }

    return this.plagiarismService.checkPlagiarism(
      submissionId,
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/plagiarism-report')
  @ApiOperation({
    summary: 'Get plagiarism check result and download PDF report',
    description:
      'Returns plagiarism data and PDF download URL for the submission',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plagiarism result retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        submissionId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['not_checked', 'processing', 'completed', 'failed'],
        },
        score: { type: 'number', nullable: true },
        wordCount: { type: 'number', nullable: true },
        creditsUsed: { type: 'number', nullable: true },
        checkedAt: { type: 'string', nullable: true },
        detailedResults: { type: 'object', nullable: true },
        pdfReportUrl: {
          type: 'string',
          nullable: true,
          description: 'URL to download PDF report',
        },
      },
    },
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
    // 🔧 Add validation for UUID format
    if (
      !submissionId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    ) {
      throw new BadRequestException('Invalid submission ID format');
    }

    return this.plagiarismService.getPlagiarismResult(
      submissionId,
      req.user.userId,
      req.user.role,
    );
  }

  // Admin endpoint untuk monitoring queue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/plagiarism/queue-stats')
  @ApiOperation({
    summary: 'Get plagiarism queue statistics (Instructor only)',
    description:
      'Monitor the status of plagiarism check queue for debugging and monitoring',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        waiting: { type: 'number' },
        active: { type: 'number' },
        completed: { type: 'number' },
        failed: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  async getQueueStats() {
    return this.plagiarismService.getQueueStats();
  }
}
