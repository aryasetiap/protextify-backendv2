import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns profile information of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        institution: 'Universitas Test',
        role: 'STUDENT',
        emailVerified: true,
        createdAt: '2025-06-01T12:00:00.000Z',
        updatedAt: '2025-06-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: { example: { statusCode: 404, message: 'User not found' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  async getMe(@Req() req) {
    return this.usersService.getMe(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update profile information of the authenticated user (fullName, institution).',
  })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      updateName: {
        summary: 'Update full name',
        value: { fullName: 'Nama Baru' },
      },
      updateInstitution: {
        summary: 'Update institution',
        value: { institution: 'Universitas Protextify' },
      },
      updateBoth: {
        summary: 'Update both fields',
        value: {
          fullName: 'Nama Baru',
          institution: 'Universitas Protextify',
        },
      },
      fullProfile: {
        summary: 'Update full profile',
        value: {
          fullName: 'Dr. Jane Doe',
          institution: 'Universitas Protextify',
          phone: '+628123456789',
          bio: 'Dosen senior dengan fokus pada AI.',
          avatarUrl: 'https://storage.protextify.com/avatars/user-123.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    schema: {
      example: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Nama Baru',
        institution: 'Universitas Protextify',
        role: 'STUDENT',
        emailVerified: true,
        updatedAt: '2025-06-01T13:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: { example: { statusCode: 404, message: 'User not found' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  async updateMe(@Req() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.userId, dto);
  }
}
