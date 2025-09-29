import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
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

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Callback endpoint after Google login. Returns JWT and redirects to frontend.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with JWT token',
    schema: {
      example: 'http://localhost:3000/auth/callback?token=jwt_token_here',
    },
  })
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res) {
    const user = req.user;
    const payload = { sub: user.id, email: user.email, role: user.role };
    // Gunakan AuthService untuk generate JWT
    const accessToken = await this.authService.generateJwtForUser(user);
    // Redirect ke frontend dengan token
    res.redirect(`http://localhost:3000/auth/callback?token=${accessToken}`);
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
}
