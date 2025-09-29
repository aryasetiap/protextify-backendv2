import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  password: 'hashedPassword',
  fullName: 'Test User',
  role: 'STUDENT',
  emailVerified: false,
  googleId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  institution: 'Test University',
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;

  // Mock providers
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'STUDENT',
    };

    it('should register a new user successfully', async () => {
      // Skenario: Email belum terdaftar
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      // Mock hashing password
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      // Mock user creation
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      // Mock email sending
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      // Verifikasi: Fungsi-fungsi yang relevan dipanggil dengan benar
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { ...registerDto, password: 'hashedPassword' },
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      // Verifikasi: Hasilnya sesuai ekspektasi (password tidak dikembalikan)
      expect(result).toEqual({
        message: 'Registration successful, verification email sent',
        user: { ...mockUser, password: undefined },
      });
    });

    it('should throw ConflictException if email is already registered', async () => {
      // Skenario: Email sudah terdaftar
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Verifikasi: Melempar error yang sesuai
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login a user and return an access token', async () => {
      // Skenario: User ada dan password cocok
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('test_access_token');

      const result = await service.login(loginDto);

      // Verifikasi: Fungsi-fungsi yang relevan dipanggil
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      // Verifikasi: Hasilnya sesuai ekspektasi
      expect(result).toEqual({
        accessToken: 'test_access_token',
        user: { ...mockUser, password: undefined },
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Skenario: User tidak ditemukan
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Verifikasi: Melempar error yang sesuai
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      // Skenario: User ada, tapi password salah
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Verifikasi: Melempar error yang sesuai
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateJwtForUser', () => {
    it('should generate a JWT for a given user', async () => {
      const userPayload = {
        id: 'user-id-1',
        email: 'social@example.com',
        role: 'STUDENT',
      };
      const expectedToken = 'social_user_token';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateJwtForUser(userPayload);

      // Verifikasi: jwtService dipanggil dengan payload yang benar
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: userPayload.id,
        email: userPayload.email,
        role: userPayload.role,
      });
      // Verifikasi: Token yang dihasilkan benar
      expect(result).toBe(expectedToken);
    });
  });
});
