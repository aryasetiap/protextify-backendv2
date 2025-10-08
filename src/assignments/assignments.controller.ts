import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
  Query, // 🆕 Tambahkan import ini
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery, // 🆕 Tambahkan import ini
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('assignments')
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('classes/:classId/assignments')
  @ApiOperation({
    summary: 'Create new assignment for a class',
    description:
      'Instructor creates a new assignment for a class. Assignment will be inactive until payment is completed.',
  })
  @ApiParam({
    name: 'classId',
    type: String,
    description: 'ID of the class',
    example: 'class-123',
  })
  @ApiBody({
    type: CreateAssignmentDto,
    examples: {
      default: {
        summary: 'Example payload',
        value: {
          title: 'Tugas Kalkulus',
          instructions: 'Kerjakan soal halaman 50.',
          deadline: '2025-12-31T23:59:59Z',
          expectedStudentCount: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Assignment created, payment required to activate',
    schema: {
      example: {
        assignment: {
          id: 'assignment-xyz',
          title: 'Tugas Kalkulus',
          instructions: 'Kerjakan soal halaman 50.',
          deadline: '2025-12-31T23:59:59.000Z',
          classId: 'class-123',
          expectedStudentCount: 10,
          active: false,
        },
        paymentRequired: true,
        totalPrice: 25000,
        pricePerStudent: 2500,
        expectedStudentCount: 10,
        message: 'Assignment created. Please complete payment to activate.',
        paymentData: {
          amount: 25000,
          assignmentId: 'assignment-xyz',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
    schema: { example: { statusCode: 404, message: 'Class not found' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your class',
    schema: { example: { statusCode: 403, message: 'Not your class' } },
  })
  async createAssignment(
    @Param('classId') classId: string,
    @Req() req,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.createAssignment(
      classId,
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('classes/:classId/assignments')
  @ApiOperation({
    summary: 'Get assignments for a class',
    description:
      'Returns all assignments for a class. Students only see active assignments.',
  })
  @ApiParam({
    name: 'classId',
    type: String,
    description: 'ID of the class',
    example: 'class-123',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of assignments for the class. Students only see active assignments.',
    schema: {
      example: [
        {
          id: 'assignment-xyz',
          title: 'Tugas Kalkulus',
          instructions: 'Kerjakan soal halaman 50.',
          deadline: '2025-12-31T23:59:59.000Z',
          classId: 'class-123',
          expectedStudentCount: 10,
          active: true,
          createdAt: '2025-06-01T12:00:00.000Z',
          submissions: [
            {
              id: 'submission-1',
              status: 'SUBMITTED',
              grade: 90,
              updatedAt: '2025-06-01T13:00:00.000Z',
            },
          ],
          _count: { submissions: 5 },
        },
        {
          id: 'assignment-abc',
          title: 'Tugas Fisika',
          instructions: 'Kerjakan soal halaman 25.',
          deadline: '2025-12-25T23:59:59.000Z',
          classId: 'class-123',
          expectedStudentCount: 10,
          active: true,
          createdAt: '2025-06-02T12:00:00.000Z',
          submissions: [],
          _count: { submissions: 0 },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
    schema: { example: { statusCode: 404, message: 'Class not found' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not your class',
    schema: { example: { statusCode: 403, message: 'Not your class' } },
  })
  async getAssignments(@Param('classId') classId: string, @Req() req) {
    return this.assignmentsService.getAssignments(
      classId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('assignments/recent')
  @ApiOperation({
    summary: 'Get recent assignments for student',
    description: 'Returns recent assignments from all enrolled classes.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of assignments to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent assignments',
    schema: {
      example: [
        {
          id: 'assignment-xyz',
          title: 'Tugas Kalkulus',
          instructions: 'Kerjakan soal halaman 50.',
          deadline: '2025-12-31T23:59:59.000Z',
          classId: 'class-123',
          class: { name: 'Kelas Kalkulus' },
          active: true,
          submissions: [],
          _count: { submissions: 5 },
        },
      ],
    },
  })
  async getRecentAssignments(@Req() req, @Query('limit') limit?: number) {
    const parsedLimit = limit ? parseInt(limit.toString()) : 10;
    return this.assignmentsService.getRecentAssignments(
      req.user.userId,
      parsedLimit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('assignments/:id')
  @ApiOperation({
    summary: 'Get assignment detail by ID',
    description: 'Returns assignment detail for given assignment ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Assignment ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment detail',
    schema: {
      example: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
        title: 'Tugas Kalkulus',
        description: 'Kerjakan soal halaman 50.',
        deadline: '2025-12-31T23:59:59.000Z',
        content: '',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: { example: { statusCode: 404, message: 'Assignment not found' } },
  })
  async getAssignmentDetail(@Param('id') id: string) {
    return this.assignmentsService.getAssignmentDetail(id);
  }
}
