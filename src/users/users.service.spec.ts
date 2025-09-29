import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

// Mock untuk PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    password: 'hashedpassword',
    institution: 'Universitas Test',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMe', () => {
    it('should return user data without the password', async () => {
      // Arrange: Atur mock untuk mengembalikan data user
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Act: Panggil method yang akan diuji
      const result = await service.getMe('user-123');

      // Assert: Verifikasi hasilnya
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result.fullName).toEqual(mockUser.fullName);
      expect(result.password).toBeUndefined(); // Pastikan password dihapus
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Arrange: Atur mock untuk mengembalikan null (user tidak ditemukan)
      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert: Verifikasi bahwa exception dilempar
      await expect(service.getMe('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('should update user data and return the updated user without password', async () => {
      const dto: UpdateUserDto = {
        fullName: 'Updated Name',
        institution: 'Universitas Baru',
      };
      const updatedUser = { ...mockUser, ...dto };

      // Arrange
      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateMe('user-123', dto);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          fullName: dto.fullName,
          institution: dto.institution,
        },
      });
      expect(result.fullName).toBe('Updated Name');
      expect(result.password).toBeUndefined();
    });

    it('should handle partial updates correctly', async () => {
      const dto: UpdateUserDto = {
        fullName: 'Only Name Updated',
      };
      const updatedUser = { ...mockUser, ...dto };

      // Arrange
      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateMe('user-123', dto);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          fullName: dto.fullName,
          institution: undefined, // institution tidak ada di DTO
        },
      });
      expect(result.fullName).toBe('Only Name Updated');
      expect(result.institution).toBe(mockUser.institution); // institution tidak berubah
    });
  });
});
