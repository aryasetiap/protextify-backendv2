import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
}
