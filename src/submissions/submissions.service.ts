import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway, // Inject RealtimeGateway
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
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { content: dto.content },
    });
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
      message: `Your submission has been graded: ${grade}`,
      data: { submissionId, grade },
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
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true },
    });
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

  async downloadSubmission(submissionId: string, userId: string, role: string) {
    // TODO: Integrasi file storage, generate PDF/DOCX, return download URL
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { student: true, assignment: { include: { class: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (
      (role === 'STUDENT' && submission.studentId !== userId) ||
      (role === 'INSTRUCTOR' &&
        submission.assignment.class.instructorId !== userId)
    )
      throw new ForbiddenException('No access');
    // Return dummy URL for now
    return {
      url: `https://storage.example.com/submissions/${submissionId}.pdf`,
    };
  }
}
