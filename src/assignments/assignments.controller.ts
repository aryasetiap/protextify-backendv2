import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('assignments')
@Controller('classes/:classId/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post()
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
  @Get()
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
          submissions: [],
          _count: { submissions: 5 },
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
}
