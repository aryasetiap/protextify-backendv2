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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post()
  async createClass(@Req() req, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('join')
  async joinClass(@Req() req, @Body() dto: JoinClassDto) {
    return this.classesService.joinClass(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getClasses(@Req() req) {
    return this.classesService.getClasses(req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getClassDetail(@Param('id') id: string) {
    return this.classesService.getClassDetail(id);
  }
}
