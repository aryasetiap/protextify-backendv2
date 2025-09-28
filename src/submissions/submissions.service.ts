import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StorageService } from '../storage/storage.service'; // 🆕 Import StorageService

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private storageService: StorageService, // 🆕 Inject StorageService
  ) {}

  async createSubmission(
    assignmentId: string,
    dto: CreateSubmissionDto,
    studentId: string,
  ) {
    // Cek assignment aktif
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || !assignment.active)
      throw new ForbiddenException('Assignment not active');
    // Cek quota
    const count = await this.prisma.submission.count({
      where: { assignmentId },
    });
    if (count >= assignment.expectedStudentCount)
      throw new ForbiddenException('Assignment quota full');
    // Cek duplikasi
    const existing = await this.prisma.submission.findFirst({
      where: { assignmentId, studentId },
    });
    if (existing) throw new ForbiddenException('Already submitted');
    return this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content: dto.content,
        status: 'DRAFT',
      },
    });
  }

  async getSubmissionDetail(
    submissionId: string,
    userId: string,
    role: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true, plagiarismChecks: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (role === 'STUDENT' && submission.studentId !== userId)
      throw new ForbiddenException('Not your submission');
    return submission;
  }

  async updateContent(
    submissionId: string,
    dto: UpdateContentDto,
    userId: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.studentId !== userId)
      throw new ForbiddenException('Not your submission');

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { content: dto.content },
    });

    // Broadcast content update via WebSocket
    this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
      status: updatedSubmission.status,
      updatedAt: updatedSubmission.updatedAt.toISOString(),
    });

    return updatedSubmission;
  }

  async submit(submissionId: string, userId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.studentId !== userId)
      throw new ForbiddenException('Not your submission');
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'SUBMITTED' },
    });
  }

  async grade(submissionId: string, grade: number, instructorId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { class: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.assignment.class.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { grade, status: 'GRADED' },
    });

    // Broadcast submission update via WebSocket
    this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
      status: 'GRADED',
      grade: grade,
      updatedAt: updatedSubmission.updatedAt.toISOString(),
    });

    // Send notification to student
    this.realtimeGateway.sendNotification(submission.studentId, {
      type: 'grade_received',
      message: `You received a grade of ${grade} for your submission.`,
      data: {
        submissionId,
        grade,
        assignmentTitle: submission.assignment.title,
      },
      createdAt: new Date().toISOString(),
    });

    return updatedSubmission;
  }

  async getSubmissionsForAssignment(
    classId: string,
    assignmentId: string,
    instructorId: string,
  ) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!kelas || kelas.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true, plagiarismChecks: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Prepare payload for WebSocket event
    const payload = submissions.map((s) => ({
      submissionId: s.id,
      studentId: s.studentId,
      status: s.status,
      plagiarismScore: s.plagiarismChecks?.score,
      lastUpdated: s.updatedAt.toISOString(),
    }));

    // Broadcast to assignment room
    this.realtimeGateway.broadcastSubmissionListUpdated(assignmentId, payload);

    return submissions;
  }

  async getStudentHistory(studentId: string) {
    return this.prisma.submission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClassHistory(classId: string, instructorId: string) {
    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!kelas || kelas.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');
    return this.prisma.submission.findMany({
      where: { assignment: { classId } },
      include: { student: true, assignment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🆕 Updated download method with storage integration
  async downloadSubmission(
    submissionId: string,
    userId: string,
    role: string,
    format: 'pdf' | 'docx' = 'pdf',
  ) {
    // Validate format
    if (!['pdf', 'docx'].includes(format)) {
      throw new BadRequestException(
        'Invalid format. Supported formats: pdf, docx',
      );
    }

    try {
      // Generate file using StorageService
      const result =
        format === 'pdf'
          ? await this.storageService.generatePDF(submissionId, userId, role)
          : await this.storageService.generateDOCX(submissionId, userId, role);

      return {
        ...result,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to generate file');
    }
  }
}
