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
          select: {
            id: true,
            status: true,
            grade: true,
            updatedAt: true,
            // 🆕 Include student info for instructor view
            ...(role === 'INSTRUCTOR' && {
              student: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            }),
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return assignments;
  }

  async getRecentAssignments(userId: string, limit = 10) {
    // Get all class IDs the student is enrolled in
    const enrolledClasses = await this.prisma.classEnrollment.findMany({
      where: { studentId: userId },
      select: { classId: true },
    });
    if (enrolledClasses.length === 0) return [];

    const classIds = enrolledClasses.map((e) => e.classId);

    // Get recent assignments from those classes
    return this.prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
        active: true, // Hanya assignment yang aktif
      },
      take: limit,
      orderBy: [
        { deadline: 'asc' }, // Prisma tidak support 'nulls' di sini
        { createdAt: 'desc' },
      ],
      include: {
        class: { select: { name: true } },
        submissions: {
          where: { studentId: userId },
          select: { id: true, status: true, grade: true, updatedAt: true },
        },
        _count: { select: { submissions: true } },
      },
    });
  }

  async getAssignmentDetail(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        submissions: true,
        _count: {
          select: { submissions: true },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async getAssignmentAnalytics(assignmentId: string, instructorId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          select: { instructorId: true },
        },
        submissions: {
          include: {
            student: {
              select: { fullName: true },
            },
            plagiarismChecks: {
              select: { score: true },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.class.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have access to this assignment');
    }

    const { submissions } = assignment;

    // Calculate stats
    const gradedSubmissions = submissions.filter((s) => s.status === 'GRADED');
    const submittedAndGraded = submissions.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'GRADED',
    );

    const plagiarismScores = submissions
      .map((s) => s.plagiarismChecks?.score)
      .filter((score): score is number => score != null);

    const grades = gradedSubmissions
      .map((s) => s.grade)
      .filter((grade): grade is number => grade != null);

    const stats = {
      totalSubmissions: submissions.length,
      submittedCount: submittedAndGraded.length,
      gradedCount: gradedSubmissions.length,
      avgPlagiarism:
        plagiarismScores.length > 0
          ? Math.round(
              plagiarismScores.reduce((acc, score) => acc + score, 0) /
                plagiarismScores.length,
            )
          : 0,
      avgGrade:
        grades.length > 0
          ? Math.round(
              grades.reduce((acc, grade) => acc + grade, 0) / grades.length,
            )
          : 0,
    };

    // Format submissions
    const formattedSubmissions = submissions.map((s) => ({
      id: s.id,
      student: { fullName: s.student.fullName },
      status: s.status,
      grade: s.grade,
      plagiarismChecks: s.plagiarismChecks
        ? { score: s.plagiarismChecks.score }
        : null,
      updatedAt: s.updatedAt.toISOString(),
    }));

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        classId: assignment.classId,
      },
      stats,
      submissions: formattedSubmissions,
    };
  }

  async getAssignmentSubmissionsOverview(
    assignmentId: string,
    instructorId: string,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: { id: true, fullName: true },
                },
              },
            },
          },
        },
        submissions: {
          include: {
            plagiarismChecks: {
              select: { score: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.class.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have access to this assignment');
    }

    const allStudents = assignment.class.enrollments.map((e) => e.student);
    const submissionsMap = new Map(
      assignment.submissions.map((s) => [s.studentId, s]),
    );

    const totalStudents = allStudents.length;
    const submittedCount = assignment.submissions.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'GRADED',
    ).length;
    const gradedCount = assignment.submissions.filter(
      (s) => s.status === 'GRADED',
    ).length;
    const pendingCount = totalStudents - submittedCount;

    const stats = {
      totalStudents,
      submittedCount,
      gradedCount,
      pendingCount,
    };

    const submissionsOverview = allStudents.map((student) => {
      const submission = submissionsMap.get(student.id);
      if (submission) {
        return {
          id: submission.id,
          student: {
            id: student.id,
            fullName: student.fullName,
          },
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString() || null,
          grade: submission.grade,
          plagiarismScore: submission.plagiarismChecks?.score ?? null,
        };
      } else {
        return {
          id: null,
          student: {
            id: student.id,
            fullName: student.fullName,
          },
          status: 'PENDING',
          submittedAt: null,
          grade: null,
          plagiarismScore: null,
        };
      }
    });

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        instructions: assignment.instructions,
        deadline: assignment.deadline?.toISOString() || null,
        classId: assignment.classId,
        active: assignment.active,
      },
      stats,
      submissions: submissionsOverview,
    };
  }
}
