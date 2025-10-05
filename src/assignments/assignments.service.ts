import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(
    classId: string,
    dto: CreateAssignmentDto,
    instructorId: string,
  ) {
    // Cek kelas dan instruktur
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { enrollments: true },
    });

    if (!kelas) throw new NotFoundException('Class not found');
    if (kelas.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');

    // Harga assignment berdasarkan input instruktur
    const pricePerStudent = 2500;
    const totalPrice = dto.expectedStudentCount * pricePerStudent;

    // Buat assignment (tidak aktif sampai pembayaran selesai)
    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        instructions: dto.instructions,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        classId,
        expectedStudentCount: dto.expectedStudentCount,
        active: false, // Akan diaktifkan setelah pembayaran
      },
    });

    // Return data untuk pembayaran
    return {
      assignment,
      paymentRequired: true,
      totalPrice,
      pricePerStudent,
      expectedStudentCount: dto.expectedStudentCount,
      message: 'Assignment created. Please complete payment to activate.',
      paymentData: {
        amount: totalPrice,
        assignmentId: assignment.id,
      },
    };
  }

  async getAssignments(classId: string, userId: string, role: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!kelas) throw new NotFoundException('Class not found');

    if (role === 'INSTRUCTOR' && kelas.instructorId !== userId) {
      throw new ForbiddenException('Not your class');
    }

    const assignments = await this.prisma.assignment.findMany({
      where: {
        classId,
        // Student hanya bisa lihat assignment yang aktif
        ...(role === 'STUDENT' && { active: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          where: role === 'STUDENT' ? { studentId: userId } : undefined,
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return assignments;
  }

  async getRecentAssignments(userId: string, limit = 3) {
    // Validasi input limit
    if (limit < 1 || limit > 20) {
      throw new BadRequestException('Limit must be between 1 and 20');
    }

    // Get classes that user enrolled in
    const enrolledClasses = await this.prisma.classEnrollment.findMany({
      where: { studentId: userId },
      select: { classId: true },
    });

    // Jika student belum join kelas manapun
    if (enrolledClasses.length === 0) {
      return [];
    }

    const classIds = enrolledClasses.map((e) => e.classId);

    // Get recent assignments from enrolled classes
    const assignments = await this.prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
        active: true, // Hanya assignment yang aktif
      },
      take: limit,
      orderBy: [
        { deadline: { sort: 'asc', nulls: 'last' } }, // Deadline terdekat dulu
        { createdAt: 'desc' }, // Jika deadline sama, yang terbaru dibuat dulu
      ],
      select: {
        id: true,
        title: true,
        deadline: true,
        active: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    return assignments;
  }
}
