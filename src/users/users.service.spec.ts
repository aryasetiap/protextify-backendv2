import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new UsersService(prisma);
  });

  describe('getMe', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe('uid')).rejects.toThrow(NotFoundException);
    });

    it('should return user data without password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        email: 'test@mail.com',
        password: 'hashed',
        fullName: 'Test',
        role: 'STUDENT',
      });
      const result = await service.getMe('uid');
      expect(result.id).toBe('uid');
      expect(result.password).toBeUndefined();
    });
  });

  describe('updateMe', () => {
    it('should update user and return data without password', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'uid',
        email: 'test@mail.com',
        password: 'hashed',
        fullName: 'Updated',
        institution: 'Univ',
        role: 'STUDENT',
      });
      const dto = { fullName: 'Updated', institution: 'Univ' };
      const result = await service.updateMe('uid', dto);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { fullName: 'Updated', institution: 'Univ' },
      });
      expect(result.fullName).toBe('Updated');
      expect(result.password).toBeUndefined();
    });
  });
});
