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
    const price = dto.expectedStudentCount * 2500;

    // Simpan transaksi pembayaran (status: PENDING)
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: instructorId,
        amount: price,
        creditsPurchased: 0,
        status: 'PENDING',
        midtransOrderId: `ASSIGN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      },
    });

    // Assignment dibuat dengan status tidak aktif (misal: tambahkan field 'active' jika perlu)
    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        instructions: dto.instructions,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        classId,
        expectedStudentCount: dto.expectedStudentCount,
        active: false, // assignment belum aktif sebelum pembayaran
      },
    });

    // Kirim data transaksi ke frontend untuk proses pembayaran
    return {
      assignment,
      price,
      expectedStudentCount: dto.expectedStudentCount,
      transaction,
      message: 'Assignment created, please complete payment to activate.',
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
    return this.prisma.assignment.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
