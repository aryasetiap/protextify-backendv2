import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let emailService: EmailService;

  // Mock services
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    generateJwtForUser: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    verifyEmailToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    })
      // Abaikan guard untuk unit test controller
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the correct data', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        role: 'STUDENT',
      };
      const expectedResult = { message: 'success' };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      // Verifikasi: service dipanggil dengan DTO yang benar
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      // Verifikasi: Hasil dari controller sama dengan hasil dari service
      expect(result).toBe(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.login with the correct credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = { accessToken: 'some.token' };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      // Verifikasi: service dipanggil dengan DTO yang benar
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      // Verifikasi: Hasilnya sesuai
      expect(result).toBe(expectedResult);
    });
  });

  describe('sendVerification', () => {
    it('should call emailService.sendVerificationEmail with the correct email', async () => {
      const sendDto: SendVerificationDto = { email: 'verify@example.com' };
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        message: 'sent',
      });

      await controller.sendVerification(sendDto);

      // Verifikasi: service dipanggil dengan email yang benar
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        sendDto.email,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should call emailService.verifyEmailToken with the correct token', async () => {
      const verifyDto: VerifyEmailDto = { token: 'verification_token' };
      mockEmailService.verifyEmailToken.mockResolvedValue({
        message: 'verified',
      });

      await controller.verifyEmail(verifyDto);

      // Verifikasi: service dipanggil dengan token yang benar
      expect(emailService.verifyEmailToken).toHaveBeenCalledWith(
        verifyDto.token,
      );
    });
  });

  describe('googleAuthCallback', () => {
    it('should generate a JWT and redirect', async () => {
      const mockReq = {
        user: { id: 'google-id', email: 'google@example.com', role: 'STUDENT' },
      };
      const mockRes = {
        redirect: jest.fn(),
      };
      const accessToken = 'google_jwt_token';

      mockAuthService.generateJwtForUser.mockResolvedValue(accessToken);

      await controller.googleAuthCallback(mockReq, mockRes);

      // Verifikasi: authService.generateJwtForUser dipanggil dengan data user dari request
      expect(authService.generateJwtForUser).toHaveBeenCalledWith(mockReq.user);
      // Verifikasi: response.redirect dipanggil dengan URL dan token yang benar
      expect(mockRes.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth/callback?token=${accessToken}`,
      );
    });
  });

  describe('instructor-only', () => {
    it('should return a message for instructors', () => {
      const result = controller.getInstructorData();
      expect(result).toEqual({ message: 'Only instructor can access this!' });
    });
  });
});
