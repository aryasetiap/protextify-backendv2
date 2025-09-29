import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

// Mock untuk UsersService
const mockUsersService = {
  getMe: jest.fn(),
  updateMe: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: typeof mockUsersService;

  // Mock object request yang biasanya didapat dari Passport setelah JWT validasi
  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      // Bypass JwtAuthGuard untuk unit test
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
    jest.clearAllMocks(); // Membersihkan semua mock sebelum setiap test
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should call usersService.getMe with the correct userId', async () => {
      const mockUser = { id: 'user-123', fullName: 'Test User' };
      // Arrange: Atur apa yang akan dikembalikan oleh service
      service.getMe.mockResolvedValue(mockUser);

      // Act: Panggil method controller
      const result = await controller.getMe(mockRequest);

      // Assert: Verifikasi bahwa service dipanggil dengan argumen yang benar
      expect(service.getMe).toHaveBeenCalledWith(mockRequest.user.userId);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateMe', () => {
    it('should call usersService.updateMe with userId and DTO', async () => {
      const dto: UpdateUserDto = { fullName: 'Updated Name' };
      const updatedUser = { id: 'user-123', fullName: 'Updated Name' };

      // Arrange
      service.updateMe.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateMe(mockRequest, dto);

      // Assert
      expect(service.updateMe).toHaveBeenCalledWith(
        mockRequest.user.userId,
        dto,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});
