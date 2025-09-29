import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;
  let email: jest.Mocked<EmailService>;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    } as any;
    jwt = { signAsync: jest.fn() } as any;
    email = { sendVerificationEmail: jest.fn() } as any;
    service = new AuthService(prisma, jwt, email);
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({
          email: 'test@mail.com',
          password: '123456',
          fullName: 'Test',
          role: 'STUDENT',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and send verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        email: 'test@mail.com',
        role: 'STUDENT',
      });
      email.sendVerificationEmail.mockResolvedValue(undefined);
      const result = await service.register({
        email: 'test@mail.com',
        password: '123456',
        fullName: 'Test',
        role: 'STUDENT',
      } as any);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(email.sendVerificationEmail).toHaveBeenCalledWith('test@mail.com');
      expect(result.user.password).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({
          email: 'notfound@mail.com',
          password: '123456',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: 'test@mail.com',
        password: 'hashed',
      });
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);
      await expect(
        service.login({ email: 'test@mail.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken if login success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u3',
        email: 'test@mail.com',
        password: 'hashed',
        role: 'STUDENT',
      });
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);
      jwt.signAsync.mockResolvedValue('jwt-token');
      const result = await service.login({
        email: 'test@mail.com',
        password: '123456',
      } as any);
      expect(result.accessToken).toBe('jwt-token');
      expect(result.user.password).toBeUndefined();
    });
  });

  describe('generateJwtForUser', () => {
    it('should return jwt token', async () => {
      jwt.signAsync.mockResolvedValue('jwt-token');
      const result = await service.generateJwtForUser({
        id: 'u4',
        email: 'test@mail.com',
        role: 'STUDENT',
      });
      expect(result).toBe('jwt-token');
    });
  });
});
