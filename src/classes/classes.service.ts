import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async createClass(dto: CreateClassDto, instructorId: string) {
    // Generate token unik untuk kelas
    const classToken = nanoid(8);
    const newClass = await this.prisma.class.create({
      data: {
        name: dto.name,
        description: dto.description,
        instructorId,
        classToken,
      },
    });
    return newClass;
  }

  async joinClass(dto: JoinClassDto, studentId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { classToken: dto.classToken },
    });
    if (!kelas) throw new NotFoundException('Class not found');
    // Cek apakah sudah join
    const existing = await this.prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId: kelas.id } },
    });
    if (existing) throw new ConflictException('Already joined this class');
    await this.prisma.classEnrollment.create({
      data: {
        studentId,
        classId: kelas.id,
      },
    });
    return { message: 'Successfully joined class', class: kelas };
  }

  async getClasses(userId: string, role: string) {
    if (role === 'INSTRUCTOR') {
      // Kelas yang dibuat oleh instructor
      return this.prisma.class.findMany({
        where: { instructorId: userId },
      });
    }
    // Kelas yang diikuti student
    return this.prisma.classEnrollment.findMany({
      where: { studentId: userId },
      include: { class: true },
    });
  }

  async getClassDetail(classId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        instructor: true,
        enrollments: { include: { student: true } },
        assignments: true,
      },
    });
    if (!kelas) throw new NotFoundException('Class not found');
    return kelas;
  }
}
