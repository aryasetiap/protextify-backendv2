import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock semua dependencies eksternal SEBELUM import apapun
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-token'),
  verify: jest.fn((token, secret) => ({ email: 'test@mail.com' })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html>Verification {{TOKEN}}</html>'),
}));

jest.mock('path', () => ({
  resolve: jest.fn(() => '/mocked/path/verification.html'),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock PrismaClient secara global
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

// Import setelah semua mock didefinisikan
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mockPrisma: any;

  beforeEach(() => {
    // Buat mock prisma yang sederhana
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new EmailService(mockPrisma);

    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.EMAIL_USER = 'testuser';
    process.env.EMAIL_PASS = 'testpass';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.sendVerificationEmail('notfound@mail.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if JWT_SECRET is not defined', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@mail.com' });
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      await expect(
        service.sendVerificationEmail('test@mail.com'),
      ).rejects.toThrow('JWT_SECRET is not defined');

      process.env.JWT_SECRET = originalSecret;
    });

    it('should send verification email if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@mail.com' });
      const result = await service.sendVerificationEmail('test@mail.com');
      expect(result.message).toBe('Verification email sent');
    });
  });

  describe('verifyEmailToken', () => {
    it('should throw error if JWT_SECRET is not defined', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      await expect(service.verifyEmailToken('token')).rejects.toThrow(
        'JWT_SECRET is not defined',
      );

      process.env.JWT_SECRET = originalSecret;
    });

    it('should verify email and update user', async () => {
      mockPrisma.user.update.mockResolvedValue({
        email: 'test@mail.com',
        emailVerified: true,
      });
      const result = await service.verifyEmailToken('token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@mail.com' },
        data: { emailVerified: true },
      });
      expect(result.message).toBe('Email verified');
    });

    it('should throw BadRequestException if token invalid', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid');
      });
      await expect(service.verifyEmailToken('badtoken')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
