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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PlagiarismService } from './plagiarism.service';
import { CheckPlagiarismDto, PlagiarismResultDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('plagiarism')
@ApiBearerAuth()
@Controller()
export class PlagiarismController {
  constructor(private readonly plagiarismService: PlagiarismService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('/submissions/:id/check-plagiarism')
  @ApiOperation({
    summary: 'Trigger plagiarism check for submission',
    description:
      'Instructor triggers plagiarism check for a student submission. Returns job status or queued information.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Submission ID (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    type: CheckPlagiarismDto,
    examples: {
      minimal: {
        summary: 'Minimal payload',
        value: {},
      },
      excludeSources: {
        summary: 'Exclude certain sources',
        value: {
          excluded_sources: ['https://source.com', 'https://example.com'],
          language: 'id',
          country: 'id',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Plagiarism check is queued or already in progress',
    schema: {
      example: {
        jobId: '12345',
        status: 'queued',
        message: 'Plagiarism check has been queued',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found',
    schema: { example: { statusCode: 404, message: 'Submission not found' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your class',
    schema: { example: { statusCode: 403, message: 'Not your class' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission content or format',
    schema: {
      example: { statusCode: 400, message: 'Submission content is empty' },
    },
  })
  async checkPlagiarism(
    @Param('id') submissionId: string,
    @Body() dto: CheckPlagiarismDto,
    @Req() req: any,
  ): Promise<PlagiarismResultDto> {
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
      'Returns plagiarism result data and a downloadable PDF report URL for the submission.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Submission ID (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Plagiarism result retrieved successfully',
    schema: {
      example: {
        submissionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'completed',
        score: 27,
        wordCount: 1419,
        creditsUsed: 1,
        checkedAt: '2025-06-01T14:23:00.000Z',
        pdfReportUrl:
          'https://storage.protextify.com/reports/plagiarism/f47ac10b-58cc-4372-a567-0e02b2c3d479-1623411231233.pdf',
        detailedResults: {
          result: {
            score: 27,
            textWordCounts: 1419,
            totalPlagiarismWords: 300,
          },
          sources: [
            { title: 'Source A', url: 'https://source.com', score: 80 },
          ],
          credits_used: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found',
    schema: { example: { statusCode: 404, message: 'Submission not found' } },
  })
  @ApiResponse({
    status: 403,
    description: 'No access to this submission',
    schema: {
      example: { statusCode: 403, message: 'No access to this submission' },
    },
  })
  async getPlagiarismReport(
    @Param('id') submissionId: string,
    @Req() req: any,
  ) {
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/plagiarism/queue-stats')
  @ApiOperation({
    summary: 'Get plagiarism queue statistics',
    description:
      'Monitor the status of plagiarism check queue for debugging and monitoring purposes (Instructor only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
    schema: {
      example: {
        waiting: 1,
        active: 0,
        completed: 5,
        failed: 0,
        total: 6,
      },
    },
  })
  async getQueueStats() {
    return this.plagiarismService.getQueueStats();
  }
}
