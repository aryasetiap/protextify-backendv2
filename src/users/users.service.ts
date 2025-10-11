import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService)) private authService?: AuthService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...user,
      password: undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    // Pastikan field role tidak bisa diubah
    const { fullName, institution, phone, bio, avatarUrl } = dto;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, institution, phone, bio, avatarUrl },
    });
    return {
      ...user,
      password: undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
