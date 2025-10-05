import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  Inject,
  forwardRef,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Register a new user (student or instructor) and send verification email.',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: 'Register Student',
        value: {
          email: 'student@example.com',
          password: 'password123',
          fullName: 'Student Name',
          role: 'STUDENT',
          institution: 'Universitas Protextify',
        },
      },
      instructor: {
        summary: 'Register Instructor',
        value: {
          email: 'instructor@example.com',
          password: 'password123',
          fullName: 'Instructor Name',
          role: 'INSTRUCTOR',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful, verification email sent',
    schema: {
      example: {
        message: 'Registration successful, verification email sent',
        user: {
          id: 'user-123',
          email: 'student@example.com',
          fullName: 'Student Name',
          role: 'STUDENT',
          institution: 'Universitas Protextify',
          emailVerified: false,
          createdAt: '2025-06-01T12:00:00.000Z',
          updatedAt: '2025-06-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    schema: {
      example: { statusCode: 409, message: 'Email already registered' },
    },
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Login with email and password, returns JWT access token.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      default: {
        summary: 'Login',
        value: {
          email: 'student@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, JWT returned',
    schema: {
      example: {
        accessToken: 'jwt.token.here',
        user: {
          id: 'user-123',
          email: 'student@example.com',
          fullName: 'Student Name',
          role: 'STUDENT',
          institution: 'Universitas Protextify',
          emailVerified: true,
          createdAt: '2025-06-01T12:00:00.000Z',
          updatedAt: '2025-06-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: { example: { statusCode: 401, message: 'Invalid credentials' } },
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('send-verification')
  @ApiOperation({
    summary: 'Send email verification',
    description: 'Send verification email to user.',
  })
  @ApiBody({
    type: SendVerificationDto,
    examples: {
      default: {
        summary: 'Send Verification',
        value: {
          email: 'student@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: { example: { message: 'Verification email sent' } },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: { example: { statusCode: 404, message: 'User not found' } },
  })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.emailService.sendVerificationEmail(dto.email);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email with token',
    description: 'Verify user email using verification token.',
  })
  @ApiBody({
    type: VerifyEmailDto,
    examples: {
      default: {
        summary: 'Verify Email',
        value: {
          token: 'verification_token_123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: { example: { message: 'Email verified successfully' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      example: { statusCode: 400, message: 'Invalid or expired token' },
    },
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailService.verifyEmailToken(dto.token);
  }

  @Get('google')
  @ApiOperation({
    summary: 'Google OAuth login',
    description: 'Redirect to Google OAuth login page.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google login',
  })
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Redirect handled by passport
  }

  // Modifikasi endpoint google callback untuk mendukung kedua format
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Callback endpoint after Google login. Supports both redirect and JSON response.',
  })
  async googleAuthCallback(
    @Req() req,
    @Res() res,
    @Query('format') format?: string,
  ) {
    const user = req.user;
    const accessToken = await this.authService.generateJwtForUser(user);

    // Jika frontend meminta JSON response (untuk AJAX calls)
    if (format === 'json') {
      return res.json({
        accessToken,
        user: {
          ...user,
          password: undefined,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    }

    // Default behavior: redirect ke frontend dengan token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset link to user email.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      default: {
        summary: 'Request Password Reset',
        value: {
          email: 'student@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reset password link sent',
    schema: { example: { message: 'Reset password link sent to your email' } },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: { example: { statusCode: 404, message: 'User not found' } },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Reset user password using reset token.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      default: {
        summary: 'Reset Password',
        value: {
          token: 'reset_token_123',
          newPassword: 'newPassword123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: { example: { message: 'Password reset successful' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      example: { statusCode: 400, message: 'Invalid or expired token' },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('instructor-only')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Instructor-only endpoint',
    description: 'Accessible only by users with INSTRUCTOR role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Success for instructor',
    schema: { example: { message: 'Only instructor can access this!' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not instructor)',
    schema: {
      example: {
        statusCode: 403,
        message: 'You do not have permission (role) to access this resource',
      },
    },
  })
  getInstructorData() {
    return { message: 'Only instructor can access this!' };
  }

  @Get('google/user')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user data after Google login',
    description:
      'Returns user data with access token for Google authenticated users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Google user data retrieved',
    schema: {
      example: {
        accessToken: 'jwt.token.here',
        user: {
          id: 'user-123',
          email: 'google@example.com',
          fullName: 'Google User',
          role: 'STUDENT',
          institution: null,
          emailVerified: true,
          createdAt: '2025-06-01T12:00:00.000Z',
          updatedAt: '2025-06-01T12:00:00.000Z',
        },
      },
    },
  })
  async getGoogleUser(@Req() req) {
    const user = await this.usersService.getMe(req.user.userId);
    const accessToken = await this.authService.generateJwtForUser(user);
    return {
      accessToken,
      user,
    };
  }
}
