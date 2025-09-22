import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
  async getAssignments(@Param('classId') classId: string, @Req() req) {
    return this.assignmentsService.getAssignments(
      classId,
      req.user.userId,
      req.user.role,
    );
  }
}
