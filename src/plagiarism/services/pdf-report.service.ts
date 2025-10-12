import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { WinstonAIResponse } from '../interfaces/winston-ai.interface';

@Injectable()
export class PDFReportService {
  private readonly logger = new Logger(PDFReportService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Helper to determine color based on plagiarism score.
   */
  private getScoreColor(score: number): string {
    if (score < 15) return '#28a745'; // Green
    if (score < 40) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  }

  /**
   * Renders the full text with plagiarized segments highlighted in red.
   */
  private renderHighlightedText(
    doc: PDFKit.PDFDocument,
    fullText: string,
    indexes: { startIndex: number; endIndex: number }[],
  ) {
    doc.fontSize(11).fillColor('black');
    let lastIndex = 0;

    // Sort indexes to process them in order
    const sortedIndexes = [...indexes].sort(
      (a, b) => a.startIndex - b.startIndex,
    );

    for (const segment of sortedIndexes) {
      // Render non-plagiarized text before the current segment
      if (segment.startIndex > lastIndex) {
        const nonPlagiarizedText = fullText.substring(
          lastIndex,
          segment.startIndex,
        );
        doc.fillColor('black').text(nonPlagiarizedText, { continued: true });
      }

      // Render plagiarized text in red
      const plagiarizedText = fullText.substring(
        segment.startIndex,
        segment.endIndex,
      );
      doc.fillColor('#dc3545').text(plagiarizedText, { continued: true });

      lastIndex = segment.endIndex;
    }

    // Render the remaining text after the last plagiarized segment
    if (lastIndex < fullText.length) {
      const remainingText = fullText.substring(lastIndex);
      doc.fillColor('black').text(remainingText);
    }
  }

  async generatePlagiarismReport(
    submissionId: string,
    includeDetailedResults: boolean = false,
  ): Promise<Buffer> {
    const submission = await this.prismaService.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assignment: { include: { class: true } },
        plagiarismChecks: true,
      },
    });

    if (!submission || !submission.plagiarismChecks) {
      throw new Error('Submission or plagiarism check not found');
    }

    const { plagiarismChecks } = submission;
    const rawData =
      plagiarismChecks.rawResponse as unknown as WinstonAIResponse;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // ===== HEADER =====
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .text('Plagiarism Analysis Report', { align: 'center' });
        doc.moveDown(2);

        // ===== SUMMARY SECTION =====
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Submission Summary', { underline: true });
        doc.moveDown();
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Student: ${submission.student.fullName}`)
          .text(`Assignment: ${submission.assignment.title}`)
          .text(`Class: ${submission.assignment.class.name}`)
          .text(`Checked On: ${plagiarismChecks.checkedAt.toLocaleString()}`);
        doc.moveDown(2);

        // Visual Score Display
        const scoreColor = this.getScoreColor(plagiarismChecks.score);
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Overall Plagiarism Score:', { continued: true });
        doc
          .fillColor(scoreColor)
          .text(` ${plagiarismChecks.score.toFixed(2)}%`);
        doc.fillColor('black').moveDown();

        // Key Metrics
        if (rawData && rawData.result) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Total Words: ${rawData.result.textWordCounts}`)
            .text(`Plagiarized Words: ${rawData.result.totalPlagiarismWords}`)
            .text(`Identical Words: ${rawData.result.identicalWordCounts}`)
            .text(`Sources Found: ${rawData.result.sourceCounts}`);
        }
        doc.moveDown(2);

        // ===== FULL CONTENT WITH HIGHLIGHTS =====
        doc.addPage();
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Submission Content Analysis', { underline: true });
        doc.moveDown();

        if (rawData && rawData.indexes && rawData.indexes.length > 0) {
          this.renderHighlightedText(doc, submission.content, rawData.indexes);
        } else {
          // If no plagiarism, just render the full text normally
          doc
            .fontSize(11)
            .fillColor('black')
            .text(submission.content, { align: 'justify' });
        }

        // ===== DETAILED SOURCES (INSTRUCTOR ONLY) =====
        if (
          includeDetailedResults &&
          rawData &&
          rawData.sources &&
          rawData.sources.length > 0
        ) {
          doc.addPage();
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('Detected Sources', { underline: true });
          doc.moveDown();

          const relevantSources = rawData.sources.filter((s) => s.score > 0);

          if (relevantSources.length > 0) {
            relevantSources.forEach((source, index) => {
              doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text(`${index + 1}. ${source.title || 'Unknown Title'}`);
              doc
                .fontSize(10)
                .font('Helvetica')
                .fillColor('blue')
                .text(source.url, { link: source.url, underline: true })
                .fillColor('black')
                .text(`Match Score: ${source.score.toFixed(2)}%`)
                .text(`Plagiarized Words: ${source.plagiarismWords}`);

              if (source.plagiarismFound && source.plagiarismFound.length > 0) {
                const preview = source.plagiarismFound[0].sequence.substring(
                  0,
                  150,
                );
                doc.fillColor('#555').text(`Snippet: "${preview}..."`);
              }
              doc.moveDown(1.5);
            });
          } else {
            doc
              .fontSize(12)
              .font('Helvetica')
              .text('No significant matching sources found.');
          }
        }

        // ===== FOOTER on every page =====
        const range = doc.bufferedPageRange();
        for (let i = range.start; i <= range.start + range.count - 1; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('grey')
            .text(
              'Generated by Protextify Platform',
              50,
              doc.page.height - 40,
              { align: 'left' },
            )
            .text(
              `Page ${i + 1} of ${range.count}`,
              doc.page.width - 100,
              doc.page.height - 40,
              { align: 'right' },
            );
        }

        doc.end();
      } catch (error) {
        this.logger.error(
          `Failed to generate PDF for submission ${submissionId}`,
          error.stack,
        );
        reject(error);
      }
    });
  }
}
