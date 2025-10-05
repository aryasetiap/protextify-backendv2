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
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
            },
          },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          assignments: {
            select: {
              id: true,
              title: true,
              deadline: true,
              active: true,
            },
          },
        },
      });
    }

    // For students - restructure response sesuai expectation FE
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { studentId: userId },
      include: {
        class: {
          include: {
            instructor: {
              select: {
                id: true,
                fullName: true,
              },
            },
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
            assignments: {
              where: { active: true }, // Student hanya melihat assignment aktif
              select: {
                id: true,
                title: true,
                deadline: true,
                active: true,
              },
            },
          },
        },
      },
    });

    // Transform ke struktur yang diharapkan FE
    return enrollments.map((enrollment) => ({
      ...enrollment.class,
      currentUserEnrollment: {
        id: enrollment.id,
        joinedAt: enrollment.joinedAt,
      },
    }));
  }

  async getClassDetail(classId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
          },
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        assignments: {
          select: {
            id: true,
            title: true,
            instructions: true, // 🆕 Tambahkan field ini untuk kelengkapan
            deadline: true,
            active: true,
            createdAt: true, // 🆕 Tambahkan untuk sorting/info
          },
          orderBy: { createdAt: 'desc' }, // 🆕 Urutkan assignment terbaru dulu
        },
      },
    });

    if (!kelas) throw new NotFoundException('Class not found');
    return kelas;
  }
}
