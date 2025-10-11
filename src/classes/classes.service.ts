import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { nanoid } from 'nanoid';
import { UpdateClassDto } from './dto/update-class.dto';

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

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.classEnrollment.create({
      data: {
        studentId,
        classId: kelas.id,
      },
    });

    // Log activity
    await this.prisma.classActivity.create({
      data: {
        classId: kelas.id,
        type: 'STUDENT_JOINED',
        details: {
          studentName: student.fullName,
        },
        actorId: studentId,
      },
    });

    return { message: 'Successfully joined class', class: kelas };
  }

  async updateClass(
    classId: string,
    dto: UpdateClassDto,
    instructorId: string,
  ) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!kelas) throw new NotFoundException('Class not found');
    if (kelas.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this class');

    return this.prisma.class.update({
      where: { id: classId },
      data: dto,
    });
  }

  async regenerateClassToken(classId: string, instructorId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!kelas) throw new NotFoundException('Class not found');
    if (kelas.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this class');

    const newClassToken = nanoid(8);
    return this.prisma.class.update({
      where: { id: classId },
      data: { classToken: newClassToken },
    });
  }

  async deleteClass(classId: string, instructorId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true, assignments: true } } },
    });

    if (!kelas) throw new NotFoundException('Class not found');
    if (kelas.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this class');

    if (kelas._count.enrollments > 0 || kelas._count.assignments > 0) {
      throw new BadRequestException(
        'Cannot delete class with active students or assignments.',
      );
    }

    await this.prisma.class.delete({ where: { id: classId } });
    return { message: 'Class deleted successfully' };
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

    // Enhanced student logic sesuai ekspektasi FE
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { studentId: userId },
      include: {
        class: {
          include: {
            instructor: { select: { id: true, fullName: true } },
            enrollments: {
              include: {
                student: { select: { id: true, fullName: true } },
              },
            },
            assignments: {
              where: { active: true },
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

    // Transform to expected FE structure
    return enrollments.map((enrollment) => ({
      ...enrollment.class,
      currentUserEnrollment: {
        id: enrollment.id,
        joinedAt: enrollment.joinedAt,
      },
    }));
  }

  async getClassDetail(classId: string, userId?: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        instructor: { select: { id: true, fullName: true } },
        enrollments: {
          include: {
            student: { select: { id: true, fullName: true } },
          },
        },
        assignments: {
          select: {
            id: true,
            title: true,
            instructions: true,
            deadline: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!kelas) throw new NotFoundException('Class not found');

    // Add currentUserEnrollment if userId provided
    let currentUserEnrollment: { id: string; joinedAt: Date } | null = null;
    if (userId) {
      const enrollment = await this.prisma.classEnrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: userId,
            classId: classId,
          },
        },
      });

      if (enrollment) {
        currentUserEnrollment = {
          id: enrollment.id,
          joinedAt: enrollment.joinedAt,
        };
      }
    }

    return {
      ...kelas,
      currentUserEnrollment,
    };
  }

  async getActivityFeed(classId: string, instructorId: string, limit: number) {
    // 1. Verify instructor owns the class
    const kelas = await this.prisma.class.findFirst({
      where: { id: classId, instructorId },
    });
    if (!kelas) {
      throw new ForbiddenException('You do not have access to this class');
    }

    // 2. Fetch activities
    const activities = await this.prisma.classActivity.findMany({
      where: { classId },
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        timestamp: true,
        details: true,
      },
    });

    // 3. Format response
    return activities.map((activity) => ({
      ...activity,
      timestamp: activity.timestamp.toISOString(),
    }));
  }

  async previewClass(classToken: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { classToken },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            institution: true,
          },
        },
        enrollments: true,
        assignments: {
          where: { active: true },
        },
      },
    });

    if (!kelas) throw new NotFoundException('Class not found');

    return {
      id: kelas.id,
      name: kelas.name,
      description: kelas.description,
      instructor: kelas.instructor,
      studentsCount: kelas.enrollments.length,
      assignmentsCount: kelas.assignments.length,
      createdAt: kelas.createdAt,
    };
  }
}
