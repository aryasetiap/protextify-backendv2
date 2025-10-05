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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post()
  @ApiOperation({
    summary: 'Create new class',
    description:
      'Instructor creates a new class. Generates unique class token.',
  })
  @ApiBody({
    type: CreateClassDto,
    examples: {
      default: {
        summary: 'Create class',
        value: {
          name: 'Kelas Kalkulus',
          description: 'Kelas untuk mata kuliah Kalkulus',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Class created successfully',
    schema: {
      example: {
        id: 'class-abc',
        name: 'Kelas Kalkulus',
        description: 'Kelas untuk mata kuliah Kalkulus',
        instructorId: 'instructor-123',
        classToken: '8charToken',
        createdAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  async createClass(@Req() req, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('join')
  @ApiOperation({
    summary: 'Join class using token',
    description: 'Student joins a class using a unique class token.',
  })
  @ApiBody({
    type: JoinClassDto,
    examples: {
      default: {
        summary: 'Join class',
        value: {
          classToken: '8charToken',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined class',
    schema: {
      example: {
        message: 'Successfully joined class',
        class: {
          id: 'class-abc',
          name: 'Kelas Kalkulus',
          instructorId: 'instructor-123',
          classToken: '8charToken',
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
    status: 409,
    description: 'Already joined this class',
    schema: {
      example: { statusCode: 409, message: 'Already joined this class' },
    },
  })
  async joinClass(@Req() req, @Body() dto: JoinClassDto) {
    return this.classesService.joinClass(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get classes for user',
    description:
      'Returns list of classes. Instructors get classes they created, students get classes they joined.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of classes for user',
    schema: {
      example: [
        {
          id: 'class-abc',
          name: 'Kelas Kalkulus',
          description: 'Kelas untuk mata kuliah Kalkulus',
          classToken: '8charToken',
          instructorId: 'instructor-123',
          createdAt: '2025-06-01T12:00:00.000Z',
          updatedAt: '2025-06-01T12:00:00.000Z',
          instructor: {
            id: 'instructor-123',
            fullName: 'Nama Instruktur',
          },
          enrollments: [
            {
              student: {
                id: 'student-1',
                fullName: 'Siswa 1',
              },
            },
          ],
          assignments: [
            {
              id: 'assignment-1',
              title: 'Tugas 1',
              deadline: '2025-06-10T23:59:59.000Z',
              active: true,
            },
          ],
          currentUserEnrollment: {
            id: 'enrollment-xyz',
            joinedAt: '2025-06-01T12:00:00.000Z',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  async getClasses(@Req() req) {
    return this.classesService.getClasses(req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get class detail',
    description: 'Returns detailed information about a class.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID of the class',
    example: 'class-abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Class detail',
    schema: {
      example: {
        id: 'class-abc',
        name: 'Kelas Kalkulus',
        description: 'Kelas untuk mata kuliah Kalkulus',
        classToken: '8charToken',
        instructorId: 'instructor-123',
        createdAt: '2025-06-01T12:00:00.000Z',
        updatedAt: '2025-06-01T12:00:00.000Z',
        instructor: {
          id: 'instructor-123',
          fullName: 'Nama Instruktur',
        },
        enrollments: [
          { student: { id: 'student-1', fullName: 'Siswa 1' } },
          { student: { id: 'student-2', fullName: 'Siswa 2' } },
        ],
        assignments: [
          {
            id: 'assignment-1',
            title: 'Tugas 1',
            instructions: 'Kerjakan soal halaman 50.',
            deadline: '2025-06-10T23:59:59.000Z',
            active: true,
            createdAt: '2025-06-01T12:00:00.000Z',
          },
        ],
        currentUserEnrollment: {
          id: 'enrollment-xyz',
          joinedAt: '2025-06-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
    schema: { example: { statusCode: 404, message: 'Class not found' } },
  })
  async getClassDetail(@Param('id') id: string, @Req() req) {
    // Pass userId for currentUserEnrollment calculation
    return this.classesService.getClassDetail(id, req.user?.userId);
  }

  @Get('preview/:classToken')
  @ApiOperation({
    summary: 'Preview class information before joining',
    description:
      'Public endpoint to preview class details using class token. No authentication required.',
  })
  @ApiParam({
    name: 'classToken',
    type: String,
    description: 'Unique class token',
    example: 'Ab3Xy9Qz',
  })
  @ApiResponse({
    status: 200,
    description: 'Class preview information',
    schema: {
      example: {
        id: 'class-abc',
        name: 'Kelas Kalkulus',
        description: 'Kelas untuk mata kuliah Kalkulus',
        instructor: {
          id: 'instructor-123',
          fullName: 'Dr. Ahmad Suharto',
          institution: 'Universitas Indonesia',
        },
        studentsCount: 25,
        assignmentsCount: 3,
        createdAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
    schema: { example: { statusCode: 404, message: 'Class not found' } },
  })
  async previewClass(@Param('classToken') classToken: string) {
    return this.classesService.previewClass(classToken);
  }
}
