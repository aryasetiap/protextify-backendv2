import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';

// Mock dependensi eksternal
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// PERBAIKAN: Mock 'fs' sambil mempertahankan fungsi aslinya
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Impor semua fungsi asli dari 'fs'
  readFileSync: jest.fn(), // Timpa hanya fungsi readFileSync
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

// Mock user data
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

describe('EmailService', () => {
  let service: EmailService;
  let prisma: PrismaService;
  let mockedJwt: jest.Mocked<typeof jwt>;
  let mockedFs: jest.Mocked<typeof fs>;
  let mockedNodemailer: jest.Mocked<typeof nodemailer>;

  // Mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Simpan process.env asli untuk di-restore setelah setiap test
    const originalEnv = process.env;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    prisma = module.get<PrismaService>(PrismaService);

    // Typing untuk mock agar autocomplete bekerja
    mockedJwt = jwt as jest.Mocked<typeof jwt>;
    mockedFs = fs as jest.Mocked<typeof fs>;
    mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

    // Reset env dan mocks sebelum setiap test
    jest.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };
  });

  afterEach(() => {
    // Pastikan tidak ada state yang bocor antar test
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    const email = 'test@example.com';

    it('should send a verification email successfully', async () => {
      // Skenario: Kasus normal, semua berjalan lancar
      // Arrange: Siapkan semua mock untuk skenario sukses
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedJwt.sign.mockReturnValue('fake-jwt-token');
      (mockedFs.readFileSync as jest.Mock).mockReturnValue(
        '<html>{{TOKEN}}</html>',
      );
      const sendMailMock = mockedNodemailer.createTransport()
        .sendMail as jest.Mock;
      sendMailMock.mockResolvedValue(true);

      // Act: Panggil method yang akan diuji
      const result = await service.sendVerificationEmail(email);

      // Assert: Verifikasi semua mock dipanggil dengan benar
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(mockedJwt.sign).toHaveBeenCalledWith({ email }, 'test-secret', {
        expiresIn: '1d',
      });
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Verifikasi Email Protextify',
          html: '<html>fake-jwt-token</html>',
        }),
      );
      expect(result).toEqual({ message: 'Verification email sent' });
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Skenario: User dengan email yang diberikan tidak ada
      // Arrange: Mock Prisma untuk mengembalikan null
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert: Harapkan method melempar error yang sesuai
      await expect(service.sendVerificationEmail(email)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.sendVerificationEmail(email)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw an Error if JWT_SECRET is not defined', async () => {
      // Skenario: Variabel lingkungan JWT_SECRET tidak di-set
      // Arrange: Hapus JWT_SECRET dari env
      delete process.env.JWT_SECRET;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert: Harapkan method melempar error internal
      await expect(service.sendVerificationEmail(email)).rejects.toThrow(
        'JWT_SECRET is not defined',
      );
    });
  });

  describe('verifyEmailToken', () => {
    const token = 'valid-token';
    const email = 'test@example.com';

    it('should verify token and update user email verification status', async () => {
      // Skenario: Kasus normal, token valid
      // Arrange: Mock jwt.verify untuk mengembalikan payload
      mockedJwt.verify.mockReturnValue({ email } as any);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      // Act: Panggil method
      const result = await service.verifyEmailToken(token);

      // Assert: Verifikasi token diverifikasi dan user diupdate
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: { emailVerified: true },
      });
      expect(result).toEqual({ message: 'Email verified' });
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      // Skenario: Token tidak valid (misal: expired, signature salah)
      // Arrange: Mock jwt.verify untuk melempar error
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert: Harapkan method melempar error yang user-friendly
      await expect(service.verifyEmailToken('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmailToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw an Error if JWT_SECRET is not defined', async () => {
      // Skenario: JWT_SECRET tidak ada saat verifikasi token
      // Arrange: Hapus JWT_SECRET dari env
      delete process.env.JWT_SECRET;

      // Act & Assert: Harapkan method melempar error internal
      await expect(service.verifyEmailToken(token)).rejects.toThrow(
        'JWT_SECRET is not defined',
      );
    });
  });
});
