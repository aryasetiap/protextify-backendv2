import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, password: undefined };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    // Pastikan field role tidak bisa diubah
    const { fullName, institution } = dto;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, institution },
    });
    return { ...user, password: undefined };
  }
}
