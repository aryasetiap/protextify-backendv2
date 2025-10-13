import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import { UploadFileDto, UploadResponseDto } from './dto/upload-file.dto';
import { nanoid } from 'nanoid';
import * as DOCX from 'docx';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFileResult {
  filename: string;
  url: string;
  size: number;
  format: 'pdf' | 'docx';
  cloudKey?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // Palet warna yang konsisten dengan PDF Report Service
  private readonly COLORS = {
    PRIMARY: '#4A90E2',
    TEXT: '#333333',
    SUBTLE_TEXT: '#777777',
    BACKGROUND: '#F7F9FC',
    BORDER: '#E0E6ED',
    SCORE_GREEN: '#66BB6A',
    SCORE_YELLOW: '#FFCA28',
    SCORE_RED: '#EF5350',
  };

  private readonly SUPPORTED_MIME_TYPES = {
    'application/pdf': { ext: 'pdf', maxSize: 10 * 1024 * 1024 },
    'application/msword': { ext: 'doc', maxSize: 10 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      ext: 'docx',
      maxSize: 10 * 1024 * 1024,
    },
    'image/jpeg': { ext: 'jpg', maxSize: 5 * 1024 * 1024 },
    'image/png': { ext: 'png', maxSize: 5 * 1024 * 1024 },
    'application/zip': { ext: 'zip', maxSize: 20 * 1024 * 1024 },
    'application/x-zip-compressed': { ext: 'zip', maxSize: 20 * 1024 * 1024 },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly cloudStorageProvider: CloudStorageProvider,
  ) {}

  /**
   * Helper untuk mencari path logo Protextify.
   */
  private _getLogoPath(): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'src/assets/logo-protextify-warna.png'),
      path.join(__dirname, '../../assets/logo-protextify-warna.png'),
      path.join(process.cwd(), 'dist/assets/logo-protextify-warna.png'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    this.logger.warn('Logo file not found in any expected paths.');
    return null;
  }

  /**
   * Generate PDF file from submission content
   */
  async generatePDF(
    submissionId: string,
    userId: string,
    role: string,
  ): Promise<GeneratedFileResult> {
    this.logger.log(`[STORAGE] Generating PDF for submission: ${submissionId}`);

    const submission = await this.getSubmissionWithPermissions(
      submissionId,
      userId,
      role,
    );

    return new Promise(async (resolve, reject) => {
      try {
        const filename = `submission-${submissionId}-${nanoid(8)}.pdf`;
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true,
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const cloudKey = this.cloudStorageProvider.generateFileKey(
              'submissions',
              filename,
            );
            const uploadResult = await this.cloudStorageProvider.uploadFile(
              pdfBuffer,
              cloudKey,
              'application/pdf',
              {
                submissionId,
                userId,
                role,
                generatedAt: new Date().toISOString(),
              },
            );

            const presignedUrl =
              await this.cloudStorageProvider.generatePresignedUrl(cloudKey, {
                expiresIn: 86400, // 24 hours
                filename,
              });

            const result: GeneratedFileResult = {
              filename,
              url: presignedUrl,
              size: uploadResult.size,
              format: 'pdf',
              cloudKey,
            };

            this.logger.log(
              `[STORAGE] PDF generated and uploaded successfully: ${filename}`,
            );

            await this.sendDownloadNotification(
              userId,
              role,
              'pdf',
              presignedUrl,
              submission,
            );

            resolve(result);
          } catch (error) {
            this.logger.error('PDF upload failed:', error);
            reject(error);
          }
        });

        // Generate PDF content
        this.generateStyledPDFContent(doc, submission);

        // Add headers and footers to all pages
        const logoPath = this._getLogoPath();
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          if (i > 0 && logoPath) {
            doc.image(logoPath, 50, 45, { width: 80 });
          }
          doc
            .fontSize(8)
            .fillColor(this.COLORS.SUBTLE_TEXT)
            .text(
              'Dihasilkan oleh Platform Protextify',
              50,
              doc.page.height - 60,
              { align: 'left' },
            )
            .text(
              `Halaman ${i + 1} dari ${range.count}`,
              50,
              doc.page.height - 60,
              {
                align: 'right',
                width: doc.page.width - 100,
              },
            );
        }

        doc.end();
      } catch (error) {
        this.logger.error('PDF generation failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate DOCX file from submission content
   */
  async generateDOCX(
    submissionId: string,
    userId: string,
    role: string,
  ): Promise<GeneratedFileResult> {
    this.logger.log(
      `[STORAGE] Generating DOCX for submission: ${submissionId}`,
    );

    const submission = await this.getSubmissionWithPermissions(
      submissionId,
      userId,
      role,
    );

    try {
      const filename = `submission-${submissionId}-${nanoid(8)}.docx`;
      const doc = this.createDOCXDocument(submission);
      const docxBuffer = await DOCX.Packer.toBuffer(doc);
      const cloudKey = this.cloudStorageProvider.generateFileKey(
        'submissions',
        filename,
      );
      const uploadResult = await this.cloudStorageProvider.uploadFile(
        docxBuffer,
        cloudKey,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          submissionId,
          userId,
          role,
          generatedAt: new Date().toISOString(),
        },
      );

      const presignedUrl = await this.cloudStorageProvider.generatePresignedUrl(
        cloudKey,
        {
          expiresIn: 86400, // 24 hours
          filename,
        },
      );

      const result: GeneratedFileResult = {
        filename,
        url: presignedUrl,
        size: uploadResult.size,
        format: 'docx',
        cloudKey,
      };

      this.logger.log(
        `[STORAGE] DOCX generated and uploaded successfully: ${filename}`,
      );

      await this.sendDownloadNotification(
        userId,
        role,
        'docx',
        presignedUrl,
        submission,
      );

      return result;
    } catch (error) {
      this.logger.error('DOCX generation failed:', error);
      throw new InternalServerErrorException('Failed to generate DOCX file');
    }
  }

  /**
   * Generate DOCX file buffer without uploading
   */
  async generateDOCXBuffer(submission: any): Promise<Buffer> {
    try {
      const doc = this.createDOCXDocument(submission);
      return await DOCX.Packer.toBuffer(doc);
    } catch (error) {
      this.logger.error(
        `[STORAGE] Failed to generate DOCX buffer for submission: ${submission.id}`,
        error,
      );
      throw new InternalServerErrorException('Failed to generate DOCX buffer');
    }
  }

  /**
   * Upload raw buffer to cloud storage
   */
  async uploadRawBuffer(
    buffer: Buffer,
    cloudKey: string,
    mimeType: string,
  ): Promise<void> {
    await this.cloudStorageProvider.uploadFile(buffer, cloudKey, mimeType);
  }

  /**
   * Refresh or generate a new pre-signed URL for an existing file
   */
  async refreshDownloadUrl(
    cloudKey: string,
    filename: string,
    expiresIn: number = 3600,
  ) {
    const url = await this.cloudStorageProvider.generatePresignedUrl(cloudKey, {
      expiresIn,
      filename,
    });
    return {
      url,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  /**
   * Health check for the storage service
   */
  async healthCheck() {
    try {
      const cloudStatus = await this.cloudStorageProvider.healthCheck();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'storage',
        cloudStorage: cloudStatus,
        features: {
          pdfGeneration: 'enabled',
          docxGeneration: 'enabled',
          cloudUpload: 'enabled',
          presignedUrls: 'enabled',
        },
      };
    } catch (error) {
      this.logger.error('[STORAGE] Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'storage',
        error: error.message,
      };
    }
  }

  /**
   * Cleanup old files from storage
   */
  async cleanupOldFiles(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.logger.log(
      `[STORAGE] Cleaning up files older than ${cutoffDate.toISOString()}`,
    );

    const oldAttachments = await this.prismaService.attachment.findMany({
      where: {
        uploadedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (oldAttachments.length === 0) {
      this.logger.log('[STORAGE] No old files to clean up.');
      return 0;
    }

    const keysToDelete = oldAttachments.map((att) => att.cloudKey);

    try {
      // FIX: Call deleteFile in a loop as deleteFiles is not available
      await Promise.all(
        keysToDelete.map((key) => this.cloudStorageProvider.deleteFile(key)),
      );
      const { count } = await this.prismaService.attachment.deleteMany({
        where: {
          id: {
            in: oldAttachments.map((att) => att.id),
          },
        },
      });

      this.logger.log(`[STORAGE] Successfully deleted ${count} old files.`);
      return count;
    } catch (error) {
      this.logger.error('[STORAGE] Error during file cleanup:', error);
      throw new InternalServerErrorException('Failed to clean up old files');
    }
  }

  /**
   * Generate styled PDF content (private helper)
   */
  private generateStyledPDFContent(
    doc: PDFKit.PDFDocument,
    submission: any,
  ): void {
    const logoPath = this._getLogoPath();
    if (logoPath) {
      doc.image(logoPath, 50, 45, { width: 120 });
    }
    doc
      .fillColor(this.COLORS.SUBTLE_TEXT)
      .fontSize(10)
      .text('Laporan Submission', { align: 'right' });
    doc.y = 100;

    doc
      .fillColor(this.COLORS.TEXT)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(submission.assignment.title, { align: 'left' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Oleh: ${submission.student.fullName}`);
    doc.moveDown(2);

    // --- Card Detail Submission ---
    const card1Y = doc.y;
    doc
      .roundedRect(50, card1Y, doc.page.width - 100, 100, 5)
      .fillAndStroke(this.COLORS.BACKGROUND, this.COLORS.BORDER);
    doc
      .fillColor(this.COLORS.TEXT)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Detail Submission', 70, card1Y + 15);

    doc.font('Helvetica').fontSize(10).fillColor(this.COLORS.SUBTLE_TEXT);
    doc.text(`Kelas: ${submission.assignment.class.name}`, 70, card1Y + 40);
    doc.text(`Status: ${submission.status}`, 70, card1Y + 55);
    doc.text(
      `Terakhir Diperbarui: ${submission.updatedAt.toLocaleString('id-ID')}`,
      70,
      card1Y + 70,
    );
    if (submission.grade !== null) {
      doc
        .font('Helvetica-Bold')
        .fillColor(this.COLORS.PRIMARY)
        .text(`Nilai: ${submission.grade}`, 70, card1Y + 85);
    }
    doc.y = card1Y + 115;

    // --- Card Hasil Plagiarisme (jika ada) ---
    if (
      submission.plagiarismChecks &&
      submission.plagiarismChecks.status === 'completed'
    ) {
      const card2Y = doc.y;
      doc
        .roundedRect(50, card2Y, doc.page.width - 100, 70, 5)
        .fillAndStroke(this.COLORS.BACKGROUND, this.COLORS.BORDER);
      doc
        .fillColor(this.COLORS.TEXT)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Hasil Pengecekan Plagiarisme', 70, card2Y + 15);

      doc.font('Helvetica').fontSize(10).fillColor(this.COLORS.SUBTLE_TEXT);
      doc.text(
        `Skor Plagiarisme: ${submission.plagiarismChecks.score}%`,
        70,
        card2Y + 40,
      );
      doc.text(
        `Jumlah Kata: ${submission.plagiarismChecks.wordCount}`,
        70,
        card2Y + 55,
      );
      doc.y = card2Y + 85;
    }

    // --- Konten Submission ---
    doc.addPage();
    doc.y = 100; // Space for header on new page
    doc
      .fillColor(this.COLORS.TEXT)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Konten Submission', { underline: true });
    doc.moveDown();
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .lineGap(4)
      .text(submission.content, { align: 'justify' });
  }

  /**
   * Create DOCX document (private helper)
   */
  private createDOCXDocument(submission: any): DOCX.Document {
    const plagiarismInfo =
      submission.plagiarismChecks &&
      submission.plagiarismChecks.status === 'completed'
        ? [
            new DOCX.TextRun({
              text: `Skor Plagiarisme: ${submission.plagiarismChecks.score}%`,
              break: 1,
            }),
          ]
        : [];

    return new DOCX.Document({
      sections: [
        {
          headers: {
            default: new DOCX.Header({
              children: [
                new DOCX.Paragraph({
                  children: [
                    new DOCX.TextRun(
                      `Submission: ${submission.student.fullName} - ${submission.assignment.title}`,
                    ),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new DOCX.Footer({
              children: [
                new DOCX.Paragraph({
                  alignment: DOCX.AlignmentType.CENTER,
                  children: [
                    new DOCX.TextRun({
                      children: [
                        'Generated by Protextify Platform on ',
                        new Date().toLocaleString('id-ID'),
                      ],
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            new DOCX.Paragraph({
              text: submission.assignment.title,
              heading: DOCX.HeadingLevel.HEADING_1,
            }),
            new DOCX.Paragraph({
              children: [
                new DOCX.TextRun({
                  text: `Siswa: ${submission.student.fullName}`,
                  bold: true,
                }),
                new DOCX.TextRun({
                  text: `Kelas: ${submission.assignment.class.name}`,
                  break: 1,
                }),
                new DOCX.TextRun({
                  text: `Status: ${submission.status}`,
                  break: 1,
                }),
                ...plagiarismInfo,
              ],
            }),
            new DOCX.Paragraph({ text: '' }),
            new DOCX.Paragraph({ text: submission.content }),
          ],
        },
      ],
    });
  }

  /**
   * Get submission with permission validation (private helper)
   */
  private async getSubmissionWithPermissions(
    submissionId: string,
    userId: string,
    role: string,
  ) {
    const submission = await this.prismaService.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assignment: {
          include: { class: true },
        },
        plagiarismChecks: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const isStudent = role === 'STUDENT' && submission.studentId === userId;
    const isInstructor =
      role === 'INSTRUCTOR' &&
      submission.assignment.class.instructorId === userId;

    if (!isStudent && !isInstructor) {
      throw new BadRequestException('No access to this submission');
    }

    return submission;
  }

  /**
   * Send download notification via WebSocket (private helper)
   */
  private async sendDownloadNotification(
    userId: string,
    role: string,
    format: string,
    downloadUrl: string,
    submission: any,
  ): Promise<void> {
    const targetUserId =
      role === 'STUDENT' ? userId : submission.assignment.class.instructorId;

    this.realtimeGateway.sendNotification(targetUserId, {
      type: 'file_ready',
      message: `File ${format.toUpperCase()} untuk '${
        submission.assignment.title
      }' siap diunduh.`,
      // FIX: Rename 'payload' to 'data' and add 'createdAt' to match NotificationDto
      data: {
        submissionId: submission.id,
        downloadUrl,
        format,
      },
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Upload file attachment
   */
  async uploadFileAttachment(
    file: Express.Multer.File,
    userId: string,
    dto: UploadFileDto,
  ): Promise<UploadResponseDto> {
    const { assignmentId, submissionId, description } = dto;
    const mimeTypeInfo = this.SUPPORTED_MIME_TYPES[file.mimetype];

    if (!mimeTypeInfo) {
      throw new BadRequestException('Unsupported file type');
    }
    if (file.size > mimeTypeInfo.maxSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${mimeTypeInfo.maxSize / 1024 / 1024}MB`,
      );
    }

    const fileId = nanoid();
    const cloudKey = `attachments/${fileId}.${mimeTypeInfo.ext}`;

    await this.cloudStorageProvider.uploadFile(
      file.buffer,
      cloudKey,
      file.mimetype,
      {
        originalName: file.originalname,
        uploaderId: userId,
        ...dto,
      },
    );

    const attachment = await this.prismaService.attachment.create({
      data: {
        id: fileId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        cloudKey,
        description,
        uploaderId: userId,
        assignmentId,
        submissionId,
      },
    });

    return {
      id: attachment.id,
      filename: attachment.filename,
      size: attachment.size,
      mimeType: attachment.mimeType,
      cloudKey: attachment.cloudKey,
      uploadedAt: attachment.uploadedAt.toISOString(),
    };
  }
}
