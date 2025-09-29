import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from './google.strategy';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_CLIENT_ID') return 'test_client_id';
      if (key === 'GOOGLE_CLIENT_SECRET') return 'test_client_secret';
      if (key === 'GOOGLE_CALLBACK_URL') return 'http://localhost/callback';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockProfile = {
      id: 'google-123',
      displayName: 'Google User',
      emails: [{ value: 'google.user@example.com' }],
    };
    const done = jest.fn();

    it('should create a new user if not found', async () => {
      // Skenario: User tidak ada di database (baik via googleId maupun email)
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const newUser = { id: '1', email: mockProfile.emails[0].value };
      mockPrismaService.user.create.mockResolvedValue(newUser);

      await strategy.validate('accessToken', 'refreshToken', mockProfile, done);

      // Verifikasi: Mencari user via googleId, lalu email
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: mockProfile.id },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockProfile.emails[0].value },
      });
      // Verifikasi: Membuat user baru dengan data dari profil Google
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockProfile.emails[0].value,
          fullName: mockProfile.displayName,
          googleId: mockProfile.id,
          role: 'STUDENT',
          emailVerified: true,
        },
      });
      // Verifikasi: Callback `done` dipanggil dengan user baru
      expect(done).toHaveBeenCalledWith(null, newUser);
    });

    it('should return existing user found by googleId', async () => {
      // Skenario: User ditemukan berdasarkan googleId
      const existingUser = { id: '2', googleId: mockProfile.id };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await strategy.validate('accessToken', 'refreshToken', mockProfile, done);

      // Verifikasi: Hanya mencari user via googleId
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: mockProfile.id },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      // Verifikasi: Tidak ada user baru dibuat
      expect(prisma.user.create).not.toHaveBeenCalled();
      // Verifikasi: Callback `done` dipanggil dengan user yang ada
      expect(done).toHaveBeenCalledWith(null, existingUser);
    });

    it('should link googleId to an existing user found by email', async () => {
      // Skenario: User dengan googleId tidak ada, tapi user dengan email yang sama ada
      const existingUser = {
        id: '3',
        email: mockProfile.emails[0].value,
        googleId: null,
      };
      // Panggilan pertama (by googleId) -> null, Panggilan kedua (by email) -> existingUser
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await strategy.validate('accessToken', 'refreshToken', mockProfile, done);

      // Verifikasi: Mencari via googleId lalu email
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: mockProfile.id },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockProfile.emails[0].value },
      });
      // Verifikasi: Update user yang ada untuk menambahkan googleId
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: mockProfile.emails[0].value },
        data: { googleId: mockProfile.id, emailVerified: true },
      });
      // Verifikasi: Callback `done` dipanggil dengan user yang ada (sebelum diupdate)
      expect(done).toHaveBeenCalledWith(null, existingUser);
    });
  });
});
