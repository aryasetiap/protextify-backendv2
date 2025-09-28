import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { DownloadResponseDto } from '../storage/dto/download-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('submissions')
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('/assignments/:assignmentId/submissions')
  async createSubmission(
    @Param('assignmentId') assignmentId: string,
    @Req() req,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.createSubmission(
      assignmentId,
      dto,
      req.user.userId,
    );
  }

  // 🔧 PENTING: Route yang lebih SPESIFIK harus diletakkan di ATAS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('/submissions/history')
  async getStudentHistory(@Req() req) {
    return this.submissionsService.getStudentHistory(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/classes/:classId/history')
  async getClassHistory(@Param('classId') classId: string, @Req() req) {
    return this.submissionsService.getClassHistory(classId, req.user.userId);
  }

  // 🔧 Move download endpoint BEFORE generic :id endpoint
  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/download')
  @ApiOperation({
    summary: 'Download submission as PDF or DOCX',
    description: 'Generate and download submission file in specified format',
  })
  @ApiQuery({
    name: 'format',
    enum: ['pdf', 'docx'],
    required: false,
    description: 'File format (default: pdf)',
  })
  @ApiResponse({
    status: 200,
    description: 'File generated successfully',
    type: DownloadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found',
  })
  @ApiResponse({
    status: 403,
    description: 'No access to this submission',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid format or generation failed',
  })
  async downloadSubmission(
    @Param('id') id: string,
    @Req() req,
    @Query('format') format?: 'pdf' | 'docx',
  ): Promise<DownloadResponseDto> {
    return this.submissionsService.downloadSubmission(
      id,
      req.user.userId,
      req.user.role,
      format || 'pdf',
    );
  }

  // 🔧 Generic :id routes MUST be placed LAST
  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id')
  async getSubmissionDetail(@Param('id') id: string, @Req() req) {
    return this.submissionsService.getSubmissionDetail(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Patch('/submissions/:id/content')
  async updateContent(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateContentDto,
  ) {
    return this.submissionsService.updateContent(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('/submissions/:id/submit')
  async submit(@Param('id') id: string, @Req() req) {
    return this.submissionsService.submit(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Patch('/submissions/:id/grade')
  async grade(
    @Param('id') id: string,
    @Req() req,
    @Body('grade') grade: number,
  ) {
    return this.submissionsService.grade(id, grade, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/classes/:classId/assignments/:assignmentId/submissions')
  async getSubmissionsForAssignment(
    @Param('classId') classId: string,
    @Param('assignmentId') assignmentId: string,
    @Req() req,
  ) {
    return this.submissionsService.getSubmissionsForAssignment(
      classId,
      assignmentId,
      req.user.userId,
    );
  }
}
