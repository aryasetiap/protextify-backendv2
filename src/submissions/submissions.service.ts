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
import { StorageService } from '../storage/storage.service';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import { GetClassHistoryDto } from './dto/get-class-history.dto';
import { StudentFeedbackDto } from './dto/student-feedback.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private storageService: StorageService, // 🆕 Inject StorageService
  ) {}

  /**
   * Create a new version when content is updated
   */
  private async createVersion(
    submissionId: string,
    content: string,
  ): Promise<void> {
    // Cari versi terbesar yang sudah ada
    const lastVersion = await this.prisma.submissionVersion.findFirst({
      where: { submissionId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    // Buat versi baru dengan nomor versi yang benar
    await this.prisma.submissionVersion.create({
      data: {
        submissionId,
        version: nextVersion,
        content,
      },
    });
  }

  /**
   * Get all versions of a submission
   */
  async getSubmissionVersions(
    submissionId: string,
    userId: string,
    role: string,
  ) {
    // Verify submission access
    const submission = await this.getSubmissionDetail(
      submissionId,
      userId,
      role,
    );

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const versions = await this.prisma.submissionVersion.findMany({
      where: { submissionId },
      orderBy: { version: 'asc' },
      select: {
        version: true,
        content: true,
        updatedAt: true,
      },
    });

    return versions;
  }

  /**
   * Get specific version of submission
   */
  async getSubmissionVersion(
    submissionId: string,
    version: number,
    userId: string,
    role: string,
  ) {
    // Verify submission access
    await this.getSubmissionDetail(submissionId, userId, role);

    const submissionVersion = await this.prisma.submissionVersion.findUnique({
      where: {
        submissionId_version: {
          submissionId,
          version,
        },
      },
      select: {
        version: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!submissionVersion) {
      throw new NotFoundException('Version not found');
    }

    return submissionVersion;
  }

  // Update existing methods to include versioning
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
    const submission = await this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content: dto.content,
        status: 'DRAFT',
      },
    });

    // Create initial version
    await this.createVersion(submission.id, dto.content);

    return submission;
  }

  async getSubmissionDetail(
    submissionId: string,
    userId: string,
    role: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class: true, // 🆕 Include class info untuk instructor validation
          },
        },
        plagiarismChecks: true,
        student: {
          // 🆕 Include student info untuk instructor view
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    // Enhanced permission check
    if (role === 'STUDENT' && submission.studentId !== userId) {
      throw new ForbiddenException('Not your submission');
    }

    if (
      role === 'INSTRUCTOR' &&
      submission.assignment.class.instructorId !== userId
    ) {
      throw new ForbiddenException('Not your class submission');
    }

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
      select: {
        id: true,
        content: true,
        status: true,
        updatedAt: true,
        // 🆕 Pastikan hanya field yang dibutuhkan FE yang di-return
      },
    });

    // Create new version
    await this.createVersion(submissionId, dto.content);

    // Broadcast content update via WebSocket
    this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
      status: updatedSubmission.status,
      updatedAt: updatedSubmission.updatedAt.toISOString(),
    });

    return updatedSubmission;
  }

  async submit(
    submissionId: string,
    userId: string,
    feedbackDto?: StudentFeedbackDto, // 🆕 Tambahkan parameter opsional
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { fullName: true } },
        assignment: { select: { title: true, classId: true } },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.studentId !== userId)
      throw new ForbiddenException('Not your submission');

    // Validasi feedback jika diberikan
    let feedbackData = {};
    if (feedbackDto && feedbackDto.answers) {
      if (
        !Array.isArray(feedbackDto.answers) ||
        feedbackDto.answers.length !== 5 ||
        feedbackDto.answers.some((v) => v < 1 || v > 10)
      ) {
        throw new BadRequestException(
          'Feedback answers must be array of 5 numbers (1-10)',
        );
      }
      feedbackData = { studentFeedback: feedbackDto.answers };
    } else {
      feedbackData = { studentFeedback: [] }; // Default empty array
    }

    const submittedAt = new Date();

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: submittedAt,
        ...feedbackData, // 🆕 Simpan feedback
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        studentFeedback: true, // 🆕 Return feedback
      },
    });

    // Create version when submitted (if content changed)
    if (submission.content !== submission.content) {
      await this.createVersion(submissionId, submission.content);
    }

    // Broadcast submission update via WebSocket
    this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
      status: 'SUBMITTED',
      updatedAt: submittedAt.toISOString(),
    });

    // Log activity
    await this.prisma.classActivity.create({
      data: {
        classId: submission.assignment.classId,
        type: 'SUBMISSION_SUBMITTED',
        details: {
          studentName: submission.student.fullName,
          assignmentTitle: submission.assignment.title,
        },
        actorId: userId,
      },
    });

    return updatedSubmission;
  }

  async grade(
    submissionId: string,
    dto: GradeSubmissionDto,
    instructorId: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { include: { class: true } },
        student: { select: { fullName: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.assignment.class.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { grade: dto.grade, feedback: dto.feedback, status: 'GRADED' },
    });

    // Log activity
    await this.prisma.classActivity.create({
      data: {
        classId: submission.assignment.classId,
        type: 'SUBMISSION_GRADED',
        details: {
          studentName: submission.student.fullName,
          assignmentTitle: submission.assignment.title,
          grade: dto.grade,
          feedback: dto.feedback, // 🆕 Add feedback to activity log
        },
        actorId: instructorId,
      },
    });

    // Broadcast submission update via WebSocket
    this.realtimeGateway.broadcastSubmissionUpdate(submissionId, {
      status: 'GRADED',
      grade: dto.grade,
      updatedAt: updatedSubmission.updatedAt.toISOString(),
    });

    // Send notification to student
    this.realtimeGateway.sendNotification(submission.studentId, {
      type: 'grade_received',
      message: `You received a grade of ${dto.grade} for your submission.`,
      data: {
        submissionId,
        grade: dto.grade,
        assignmentTitle: submission.assignment.title,
      },
      createdAt: new Date().toISOString(),
    });

    return updatedSubmission;
  }

  async bulkGrade(dto: BulkGradeDto, instructorId: string) {
    const { grades } = dto;
    if (!grades || grades.length === 0) {
      throw new BadRequestException('Grades array cannot be empty.');
    }

    const submissionIds = grades.map((g) => g.submissionId);

    // 1. Ambil semua submission sekaligus untuk validasi
    const submissionsToGrade = await this.prisma.submission.findMany({
      where: {
        id: { in: submissionIds },
        assignment: { class: { instructorId } }, // Filter by instructor
      },
      select: {
        id: true,
        assignment: { select: { class: { select: { instructorId: true } } } },
      },
    });

    // 2. Validasi kepemilikan dan keberadaan data
    const validSubmissionIds = new Set(submissionsToGrade.map((s) => s.id));
    for (const gradeInput of grades) {
      if (!validSubmissionIds.has(gradeInput.submissionId)) {
        throw new ForbiddenException(
          `You do not have permission to grade submission ${gradeInput.submissionId} or it does not exist.`,
        );
      }
    }

    // 3. Lakukan update dalam satu transaksi
    const updatedSubmissions = await this.prisma.$transaction(
      grades.map((gradeInput) =>
        this.prisma.submission.update({
          where: { id: gradeInput.submissionId },
          data: {
            grade: gradeInput.grade,
            feedback: gradeInput.feedback,
            status: 'GRADED',
          },
          include: {
            assignment: { select: { title: true, classId: true } },
            student: { select: { fullName: true } },
          },
        }),
      ),
    );

    // Log activities in bulk
    const activitiesData = updatedSubmissions.map((sub) => ({
      classId: sub.assignment.classId,
      type: 'SUBMISSION_GRADED' as const,
      details: {
        studentName: sub.student.fullName,
        assignmentTitle: sub.assignment.title,
        grade: sub.grade,
      },
      actorId: instructorId,
    }));
    await this.prisma.classActivity.createMany({
      data: activitiesData,
    });

    // 4. Kirim notifikasi setelah transaksi berhasil
    for (const updatedSubmission of updatedSubmissions) {
      this.realtimeGateway.broadcastSubmissionUpdate(updatedSubmission.id, {
        status: 'GRADED',
        grade: updatedSubmission.grade ?? undefined,
        updatedAt: updatedSubmission.updatedAt.toISOString(),
      });

      this.realtimeGateway.sendNotification(updatedSubmission.studentId, {
        type: 'grade_received',
        message: `You received a grade of ${updatedSubmission.grade} for assignment "${updatedSubmission.assignment.title}".`,
        data: {
          submissionId: updatedSubmission.id,
          grade: updatedSubmission.grade,
          assignmentTitle: updatedSubmission.assignment.title,
        },
        createdAt: new Date().toISOString(),
      });
    }

    return {
      message: 'Bulk grading completed successfully',
      updatedCount: updatedSubmissions.length,
    };
  }

  async bulkDownloadSubmissions(dto: BulkDownloadDto, instructorId: string) {
    const { submissionIds, format } = dto;

    // 1. Fetch and validate submissions
    const submissions = await this.prisma.submission.findMany({
      where: {
        id: { in: submissionIds },
        assignment: { class: { instructorId } },
      },
      include: {
        student: { select: { fullName: true } },
        assignment: {
          select: { title: true, class: { select: { name: true } } },
        },
        plagiarismChecks: { select: { score: true } },
      },
    });

    if (submissions.length !== submissionIds.length) {
      throw new ForbiddenException(
        'Some submissions could not be found or you do not have permission to access them.',
      );
    }

    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'csv') {
      // 2a. Generate CSV
      filename = `export-grades-${timestamp}.csv`;
      mimeType = 'text/csv';
      const headers =
        'Submission ID,Student Name,Assignment Title,Status,Grade,Feedback,Plagiarism Score\n';
      const rows = submissions
        .map(
          (s) =>
            `${s.id},"${s.student.fullName}","${s.assignment.title}",${s.status},${s.grade ?? ''},"${s.feedback ?? ''}",${s.plagiarismChecks?.score ?? ''}`,
        )
        .join('\n');
      fileBuffer = Buffer.from(headers + rows);
    } else {
      // 2b. Generate ZIP
      filename = `export-submissions-${timestamp}.zip`;
      mimeType = 'application/zip';
      const zip = new JSZip();

      for (const sub of submissions) {
        const docxBuffer = await this.storageService.generateDOCXBuffer(sub);
        const docxFilename =
          `${sub.student.fullName} - ${sub.assignment.title}.docx`.replace(
            /[\\/:*?"<>|]/g,
            '',
          );
        zip.file(docxFilename, docxBuffer);
      }
      fileBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    }

    // 3. Upload to cloud storage
    const cloudKey = `exports/${filename}`;
    await this.storageService.uploadRawBuffer(fileBuffer, cloudKey, mimeType);

    // 4. Generate pre-signed URL
    const downloadUrl = await this.storageService.refreshDownloadUrl(
      cloudKey,
      filename,
      3600, // Expires in 1 hour
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      fileCount: submissions.length,
      filename,
    };
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
      orderBy: { updatedAt: 'desc' }, // Urutkan berdasarkan update terbaru
      include: {
        assignment: {
          include: {
            class: {
              select: {
                name: true,
              },
            },
          },
        },
        plagiarismChecks: {
          select: {
            score: true,
          },
        },
      },
    });
  }

  async getClassHistory(
    classId: string,
    instructorId: string,
    query: GetClassHistoryDto,
  ) {
    const {
      page = 1,
      limit = 15,
      search,
      status,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const kelas = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!kelas || kelas.instructorId !== instructorId)
      throw new ForbiddenException('Not your class');

    const where: any = {
      assignment: { classId },
      ...(status && { status }),
      ...(search && {
        OR: [
          { student: { fullName: { contains: search, mode: 'insensitive' } } },
          {
            assignment: { title: { contains: search, mode: 'insensitive' } },
          },
        ],
      }),
    };

    const orderBy = {
      [sortBy]:
        sortBy === 'studentName'
          ? { student: { fullName: sortOrder } }
          : sortBy === 'assignmentTitle'
            ? { assignment: { title: sortOrder } }
            : sortOrder,
    };

    const [total, submissions] = await this.prisma.$transaction([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true } },
          assignment: { select: { id: true, title: true } },
          plagiarismChecks: {
            select: {
              score: true,
              status: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data: submissions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
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
