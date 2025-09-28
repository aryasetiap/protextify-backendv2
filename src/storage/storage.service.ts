import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CloudStorageProvider } from './providers/cloud-storage.provider';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as DOCX from 'docx';
import { nanoid } from 'nanoid';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly cloudStorageProvider: CloudStorageProvider,
  ) {
    this.logger.log('[STORAGE] Service initialized with cloud storage');
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

    // Get submission data
    const submission = await this.getSubmissionWithPermissions(
      submissionId,
      userId,
      role,
    );

    return new Promise((resolve, reject) => {
      try {
        const filename = `submission-${submissionId}-${nanoid(8)}.pdf`;
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        // Collect PDF data in memory
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);

            // Upload to cloud storage
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

            // Generate pre-signed URL for secure download
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

            // Send notification
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
        this.generatePDFContent(doc, submission);
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

    // Get submission data
    const submission = await this.getSubmissionWithPermissions(
      submissionId,
      userId,
      role,
    );

    try {
      const filename = `submission-${submissionId}-${nanoid(8)}.docx`;

      // Create DOCX document
      const doc = this.createDOCXDocument(submission);

      // Convert to buffer
      const docxBuffer = await DOCX.Packer.toBuffer(doc);

      // Upload to cloud storage
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

      // Generate pre-signed URL for secure download
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

      // Send notification
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
   * Generate new pre-signed URL for existing file
   */
  async refreshDownloadUrl(
    cloudKey: string,
    filename: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      return await this.cloudStorageProvider.generatePresignedUrl(cloudKey, {
        expiresIn,
        filename,
      });
    } catch (error) {
      this.logger.error(
        `Failed to refresh download URL for: ${cloudKey}`,
        error,
      );
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(cloudKey: string): Promise<void> {
    try {
      await this.cloudStorageProvider.deleteFile(cloudKey);
      this.logger.log(`[STORAGE] File deleted from cloud: ${cloudKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${cloudKey}`, error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Clean up old files (run periodically)
   */
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<number> {
    // Note: This would require listing objects in R2 and checking their metadata
    // For now, we'll implement a simple log message
    this.logger.log(
      `[STORAGE] Cleanup would delete files older than ${maxAgeDays} days`,
    );

    // TODO: Implement actual cleanup logic by:
    // 1. List objects in R2 bucket
    // 2. Check object metadata or last modified date
    // 3. Delete objects older than maxAgeDays
    // 4. Return count of deleted files

    return 0;
  }

  /**
   * Health check for storage service
   */
  async healthCheck(): Promise<any> {
    try {
      const cloudHealth = await this.cloudStorageProvider.healthCheck();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'storage',
        cloudStorage: cloudHealth,
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
   * Generate PDF content (private helper)
   */
  private generatePDFContent(doc: PDFKit.PDFDocument, submission: any): void {
    // Header
    doc.fontSize(20).text('Submission Report', 50, 50);
    doc.moveDown();

    // Submission Info
    doc.fontSize(14).text('Submission Details', 50, doc.y + 20);
    doc
      .fontSize(12)
      .text(`Student: ${submission.student.fullName}`, 50, doc.y + 20)
      .text(`Assignment: ${submission.assignment.title}`, 50, doc.y + 15)
      .text(`Class: ${submission.assignment.class.name}`, 50, doc.y + 15)
      .text(`Status: ${submission.status}`, 50, doc.y + 15)
      .text(
        `Last Updated: ${submission.updatedAt.toLocaleString()}`,
        50,
        doc.y + 15,
      );

    if (submission.grade !== null) {
      doc.text(`Grade: ${submission.grade}`, 50, doc.y + 15);
    }

    doc.moveDown();

    // Plagiarism info (if available and user has permission)
    if (
      submission.plagiarismChecks &&
      submission.plagiarismChecks.status === 'completed'
    ) {
      doc.fontSize(14).text('Plagiarism Check Results', 50, doc.y + 20);
      doc
        .fontSize(12)
        .text(
          `Plagiarism Score: ${submission.plagiarismChecks.score}%`,
          50,
          doc.y + 20,
        )
        .text(
          `Word Count: ${submission.plagiarismChecks.wordCount}`,
          50,
          doc.y + 15,
        )
        .text(
          `Checked At: ${submission.plagiarismChecks.checkedAt.toLocaleString()}`,
          50,
          doc.y + 15,
        );

      doc.moveDown();
    }

    // Content
    doc.fontSize(14).text('Submission Content', 50, doc.y + 20);
    doc.fontSize(11).text(submission.content, 50, doc.y + 15, {
      width: 500,
      align: 'justify',
    });

    // Footer
    doc
      .fontSize(8)
      .text('Generated by Protextify Platform', 50, doc.page.height - 50)
      .text(
        `Generated at: ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 35,
      );
  }

  /**
   * Create DOCX document (private helper)
   */
  private createDOCXDocument(submission: any): DOCX.Document {
    return new DOCX.Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new DOCX.Paragraph({
              text: 'Submission Report',
              heading: DOCX.HeadingLevel.TITLE,
            }),

            // Submission details
            new DOCX.Paragraph({
              text: 'Submission Details',
              heading: DOCX.HeadingLevel.HEADING_1,
            }),
            new DOCX.Paragraph({
              text: `Student: ${submission.student.fullName}`,
            }),
            new DOCX.Paragraph({
              text: `Assignment: ${submission.assignment.title}`,
            }),
            new DOCX.Paragraph({
              text: `Class: ${submission.assignment.class.name}`,
            }),
            new DOCX.Paragraph({ text: `Status: ${submission.status}` }),
            new DOCX.Paragraph({
              text: `Last Updated: ${submission.updatedAt.toLocaleString()}`,
            }),

            ...(submission.grade !== null
              ? [new DOCX.Paragraph({ text: `Grade: ${submission.grade}` })]
              : []),

            // Plagiarism results (if available)
            ...(submission.plagiarismChecks &&
            submission.plagiarismChecks.status === 'completed'
              ? [
                  new DOCX.Paragraph({
                    text: 'Plagiarism Check Results',
                    heading: DOCX.HeadingLevel.HEADING_1,
                  }),
                  new DOCX.Paragraph({
                    text: `Plagiarism Score: ${submission.plagiarismChecks.score}%`,
                  }),
                  new DOCX.Paragraph({
                    text: `Word Count: ${submission.plagiarismChecks.wordCount}`,
                  }),
                  new DOCX.Paragraph({
                    text: `Checked At: ${submission.plagiarismChecks.checkedAt.toLocaleString()}`,
                  }),
                ]
              : []),

            // Content
            new DOCX.Paragraph({
              text: 'Submission Content',
              heading: DOCX.HeadingLevel.HEADING_1,
            }),
            new DOCX.Paragraph({ text: submission.content }),

            // Footer
            new DOCX.Paragraph({ text: '' }), // Space
            new DOCX.Paragraph({
              text: `Generated by Protextify Platform at ${new Date().toLocaleString()}`,
              style: 'footer',
            }),
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

    // Check permissions
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
    try {
      this.realtimeGateway.sendNotification(userId, {
        type: 'file_ready',
        message: `Your ${format.toUpperCase()} file is ready for download!`,
        data: {
          submissionId: submission.id,
          format,
          downloadUrl,
          filename: path.basename(downloadUrl),
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(), // 24 hours from now
        },
        createdAt: new Date().toISOString(),
      });

      this.logger.log(
        `[STORAGE] Download notification sent to user: ${userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to send download notification:', error);
    }
  }
}
