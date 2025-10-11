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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { DownloadResponseDto } from '../storage/dto/download-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@ApiTags('submissions')
@ApiBearerAuth()
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('/assignments/:assignmentId/submissions')
  @ApiOperation({
    summary: 'Create new submission for assignment',
    description: 'Student creates a new submission for an assignment.',
  })
  @ApiParam({
    name: 'assignmentId',
    type: String,
    description: 'Assignment ID',
    example: 'assignment-1',
  })
  @ApiBody({
    type: CreateSubmissionDto,
    examples: {
      default: {
        summary: 'Create submission',
        value: {
          content: 'Jawaban tugas saya...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Submission created successfully',
    schema: {
      example: {
        id: 'submission-1',
        assignmentId: 'assignment-1',
        studentId: 'student-1',
        content: 'Jawaban tugas saya...',
        status: 'DRAFT',
        createdAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Assignment not active, quota full, or already submitted',
    schema: {
      example: { statusCode: 403, message: 'Assignment not active' },
    },
  })
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('/submissions/history')
  @ApiOperation({
    summary: 'Get student submission history',
    description: 'Returns all submissions made by the authenticated student.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of submissions for student',
    schema: {
      example: [
        {
          id: 'submission-1',
          assignmentId: 'assignment-1',
          content: 'Jawaban tugas saya...',
          status: 'GRADED',
          grade: 90,
          createdAt: '2025-06-01T12:00:00.000Z',
          updatedAt: '2025-06-01T13:00:00.000Z',
          assignment: {
            id: 'assignment-1',
            title: 'Tugas 1',
            deadline: '2025-06-10T23:59:59.000Z',
            class: {
              name: 'Kelas Kalkulus',
            },
          },
          plagiarismChecks: {
            score: 5.2,
          },
        },
        {
          id: 'submission-2',
          assignmentId: 'assignment-2',
          content: 'Jawaban tugas draft...',
          status: 'DRAFT',
          grade: null,
          createdAt: '2025-06-02T12:00:00.000Z',
          updatedAt: '2025-06-02T14:00:00.000Z',
          assignment: {
            id: 'assignment-2',
            title: 'Tugas 2',
            deadline: '2025-06-15T23:59:59.000Z',
            class: {
              name: 'Kelas Fisika',
            },
          },
          plagiarismChecks: null,
        },
      ],
    },
  })
  async getStudentHistory(@Req() req) {
    return this.submissionsService.getStudentHistory(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/classes/:classId/history')
  @ApiOperation({
    summary: 'Get class submission history',
    description: 'Returns all submissions for a class (instructor only).',
  })
  @ApiParam({
    name: 'classId',
    type: String,
    description: 'Class ID',
    example: 'class-1',
  })
  @ApiResponse({
    status: 200,
    description: 'List of submissions for class',
    schema: {
      example: [
        {
          id: 'submission-1',
          student: { id: 'student-1', fullName: 'Nama Siswa' },
          assignment: { id: 'assignment-1', title: 'Tugas 1' },
          status: 'SUBMITTED',
          createdAt: '2025-06-01T12:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your class',
    schema: { example: { statusCode: 403, message: 'Not your class' } },
  })
  async getClassHistory(@Param('classId') classId: string, @Req() req) {
    return this.submissionsService.getClassHistory(classId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/download')
  @ApiOperation({
    summary: 'Download submission as PDF or DOCX',
    description: 'Generate and download submission file in specified format',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiQuery({
    name: 'format',
    enum: ['pdf', 'docx'],
    required: false,
    description: 'File format (default: pdf)',
    example: 'pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'File generated successfully',
    type: DownloadResponseDto,
    schema: {
      example: {
        filename: 'submission-1.pdf',
        url: 'https://storage.protextify.com/submissions/submission-1.pdf',
        size: 12345,
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
  @ApiResponse({
    status: 400,
    description: 'Invalid format or generation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid format. Supported formats: pdf, docx',
      },
    },
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

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id')
  @ApiOperation({
    summary: 'Get submission detail',
    description: 'Returns detail of a submission (student or instructor).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission detail',
    schema: {
      example: {
        id: 'submission-1',
        assignmentId: 'assignment-1',
        studentId: 'student-1',
        content: 'Jawaban tugas saya...',
        status: 'SUBMITTED',
        grade: 90, // 🆕 Tambahkan contoh grade jika ada
        createdAt: '2025-06-01T12:00:00.000Z',
        updatedAt: '2025-06-01T13:00:00.000Z', // 🆕 Tambahkan updatedAt
        assignment: {
          // 🆕 Tambahkan detail assignment untuk completeness
          id: 'assignment-1',
          title: 'Tugas 1',
          deadline: '2025-06-10T23:59:59.000Z',
        },
        plagiarismChecks: {
          // 🆕 Tambahkan plagiarism info jika ada
          score: 5.2,
          status: 'completed',
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
    description: 'Not your submission',
    schema: { example: { statusCode: 403, message: 'Not your submission' } },
  })
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
  @ApiOperation({
    summary: 'Update submission content',
    description: 'Student updates the content of their submission.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiBody({
    type: UpdateContentDto,
    examples: {
      default: {
        summary: 'Update content',
        value: {
          content: 'Konten baru tugas...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Submission updated successfully',
    schema: {
      example: {
        id: 'submission-1',
        content: 'Konten baru tugas...',
        status: 'DRAFT',
        updatedAt: '2025-06-01T13:00:00.000Z',
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
    description: 'Not your submission',
    schema: { example: { statusCode: 403, message: 'Not your submission' } },
  })
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
  @ApiOperation({
    summary: 'Submit assignment',
    description: 'Student submits their assignment for grading.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission marked as submitted',
    schema: {
      example: {
        id: 'submission-1',
        status: 'SUBMITTED',
        submittedAt: '2025-06-01T13:10:00.000Z', // 🆕 Update example response
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
    description: 'Not your submission',
    schema: { example: { statusCode: 403, message: 'Not your submission' } },
  })
  async submit(@Param('id') id: string, @Req() req) {
    return this.submissionsService.submit(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Patch('/submissions/:id/grade')
  @ApiOperation({
    summary: 'Grade submission',
    description: 'Instructor grades a student submission.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiBody({
    type: GradeSubmissionDto,
    examples: {
      withFeedback: {
        summary: 'Grade with Feedback',
        value: {
          grade: 90,
          feedback:
            'Analisis sudah baik, namun perlu diperdalam pada bagian kesimpulan.',
        },
      },
      gradeOnly: {
        summary: 'Grade Only',
        value: {
          grade: 85,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Submission graded successfully',
    schema: {
      example: {
        id: 'submission-1',
        grade: 90,
        status: 'GRADED',
        updatedAt: '2025-06-01T13:20:00.000Z',
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
  async grade(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.submissionsService.grade(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Patch('submissions/bulk-grade')
  @ApiOperation({
    summary: 'Grade multiple submissions at once',
    description:
      'Instructor grades multiple submissions in a single transaction.',
  })
  @ApiBody({
    type: BulkGradeDto,
    examples: {
      default: {
        summary: 'Bulk Grade Example',
        value: {
          grades: [
            {
              submissionId: 'submission-1',
              grade: 90,
              feedback: 'Kerja bagus, analisisnya mendalam.',
            },
            {
              submissionId: 'submission-2',
              grade: 75,
              feedback: 'Perlu perbaikan pada bagian kesimpulan.',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk grading completed successfully',
    schema: {
      example: {
        message: 'Bulk grading completed successfully',
        updatedCount: 2,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Not your class or submission.',
  })
  @ApiResponse({ status: 404, description: 'Submission not found.' })
  async bulkGrade(@Req() req, @Body() dto: BulkGradeDto) {
    return this.submissionsService.bulkGrade(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('/classes/:classId/assignments/:assignmentId/submissions')
  @ApiOperation({
    summary: 'Get submissions for assignment',
    description:
      'Instructor gets all submissions for an assignment in their class.',
  })
  @ApiParam({
    name: 'classId',
    type: String,
    description: 'Class ID',
    example: 'class-1',
  })
  @ApiParam({
    name: 'assignmentId',
    type: String,
    description: 'Assignment ID',
    example: 'assignment-1',
  })
  @ApiResponse({
    status: 200,
    description: 'List of submissions for assignment',
    schema: {
      example: [
        {
          id: 'submission-1',
          student: { id: 'student-1', fullName: 'Nama Siswa' },
          status: 'SUBMITTED',
          updatedAt: '2025-06-01T13:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your class',
    schema: { example: { statusCode: 403, message: 'Not your class' } },
  })
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

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/versions')
  @ApiOperation({
    summary: 'Get submission versions',
    description: 'Returns all versions of a submission content.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiResponse({
    status: 200,
    description: 'List of submission versions',
    schema: {
      example: [
        {
          version: 1,
          content: 'Isi tugas versi 1',
          updatedAt: '2025-06-01T12:00:00.000Z',
        },
        {
          version: 2,
          content: 'Isi tugas versi 2',
          updatedAt: '2025-06-01T13:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found',
    schema: { example: { statusCode: 404, message: 'Submission not found' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your submission',
    schema: { example: { statusCode: 403, message: 'Not your submission' } },
  })
  async getSubmissionVersions(@Param('id') id: string, @Req() req) {
    return this.submissionsService.getSubmissionVersions(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/submissions/:id/versions/:version')
  @ApiOperation({
    summary: 'Get specific submission version',
    description: 'Returns a specific version of submission content.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Submission ID',
    example: 'submission-1',
  })
  @ApiParam({
    name: 'version',
    type: Number,
    description: 'Version number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Submission version detail',
    schema: {
      example: {
        version: 1,
        content: 'Isi tugas versi 1',
        updatedAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Submission or version not found',
    schema: { example: { statusCode: 404, message: 'Version not found' } },
  })
  async getSubmissionVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req,
  ) {
    return this.submissionsService.getSubmissionVersion(
      id,
      parseInt(version, 10),
      req.user.userId,
      req.user.role,
    );
  }
}
