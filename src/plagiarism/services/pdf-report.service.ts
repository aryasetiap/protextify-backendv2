import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { WinstonAIResponse } from '../interfaces/winston-ai.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PDFReportService {
  private readonly logger = new Logger(PDFReportService.name);

  // Palet warna modern & pastel
  private readonly COLORS = {
    PRIMARY: '#4A90E2', // Biru lembut
    TEXT: '#333333',
    SUBTLE_TEXT: '#777777',
    BACKGROUND: '#F7F9FC',
    BORDER: '#E0E6ED',
    HIGHLIGHT: '#E57373', // Merah pastel untuk teks plagiat
    SCORE_GREEN: '#66BB6A',
    SCORE_YELLOW: '#FFCA28',
    SCORE_RED: '#EF5350',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Helper untuk membersihkan tag HTML dari teks.
   */
  private _stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }

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
   * Menentukan warna skor berdasarkan persentase.
   */
  private getScoreColor(score: number): string {
    if (score < 15) return this.COLORS.SCORE_GREEN;
    if (score < 40) return this.COLORS.SCORE_YELLOW;
    return this.COLORS.SCORE_RED;
  }

  /**
   * Merender teks dengan segmen plagiat yang ditandai warna.
   */
  private renderHighlightedText(
    doc: PDFKit.PDFDocument,
    fullText: string,
    indexes: { startIndex: number; endIndex: number }[],
  ) {
    doc.fontSize(10.5).fillColor(this.COLORS.TEXT).lineGap(4);
    let lastIndex = 0;

    const sortedIndexes = [...indexes].sort(
      (a, b) => a.startIndex - b.startIndex,
    );

    for (const segment of sortedIndexes) {
      if (segment.startIndex > lastIndex) {
        const nonPlagiarizedText = fullText.substring(
          lastIndex,
          segment.startIndex,
        );
        doc.fillColor(this.COLORS.TEXT).text(nonPlagiarizedText, {
          continued: true,
          align: 'justify',
        });
      }

      const plagiarizedText = fullText.substring(
        segment.startIndex,
        segment.endIndex,
      );
      doc.fillColor(this.COLORS.HIGHLIGHT).text(plagiarizedText, {
        continued: true,
        align: 'justify',
      });

      lastIndex = segment.endIndex;
    }

    if (lastIndex < fullText.length) {
      const remainingText = fullText.substring(lastIndex);
      doc.fillColor(this.COLORS.TEXT).text(remainingText, { align: 'justify' });
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
    const cleanContent = this._stripHtml(submission.content);
    const logoPath = this._getLogoPath();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true,
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // ===== HALAMAN 1: RINGKASAN =====
        // Header
        if (logoPath) {
          doc.image(logoPath, 50, 45, { width: 120 });
        }
        doc
          .fillColor(this.COLORS.SUBTLE_TEXT)
          .fontSize(10)
          .text('Plagiarism Analysis Report', { align: 'right' });
        doc.moveDown(4);

        // Judul
        doc
          .fillColor(this.COLORS.TEXT)
          .fontSize(22)
          .font('Helvetica-Bold')
          .text(submission.assignment.title, { align: 'left' });
        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Submission by: ${submission.student.fullName}`);
        doc.moveDown(2);

        // Kartu Skor
        const scoreColor = this.getScoreColor(plagiarismChecks.score);
        doc
          .roundedRect(50, doc.y, doc.page.width - 100, 90, 5)
          .fillAndStroke(this.COLORS.BACKGROUND, this.COLORS.BORDER);
        doc
          .fillColor(this.COLORS.TEXT)
          .font('Helvetica-Bold')
          .fontSize(14)
          .text(
            'Overall Plagiarism Score',
            70,
            doc.y + 20,
            { continued: false }, // Reset continued
          );
        doc
          .font('Helvetica-Bold')
          .fontSize(36)
          .fillColor(scoreColor)
          .text(`${plagiarismChecks.score.toFixed(2)}%`, { align: 'right' });
        doc.moveDown(2);

        // Detail Submission & Metrik
        const detailsY = doc.y;
        doc
          .fillColor(this.COLORS.TEXT)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('Submission Details', 70, detailsY);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(this.COLORS.SUBTLE_TEXT)
          .text(`Class: ${submission.assignment.class.name}`, 70, doc.y + 5)
          .text(
            `Checked On: ${plagiarismChecks.checkedAt.toLocaleString('id-ID')}`,
          );

        if (rawData && rawData.result) {
          doc
            .fillColor(this.COLORS.TEXT)
            .font('Helvetica-Bold')
            .fontSize(12)
            .text('Key Metrics', 320, detailsY);
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(this.COLORS.SUBTLE_TEXT)
            .text(
              `Total Words: ${rawData.result.textWordCounts}`,
              320,
              doc.y + 5,
            )
            .text(`Plagiarized Words: ${rawData.result.totalPlagiarismWords}`)
            .text(`Sources Found: ${rawData.result.sourceCounts}`);
        }
        doc.moveDown(3);

        // ===== HALAMAN 2: ANALISIS KONTEN =====
        doc.addPage();
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .text('Submission Content Analysis', { underline: true });
        doc.moveDown();

        if (rawData && rawData.indexes && rawData.indexes.length > 0) {
          this.renderHighlightedText(doc, cleanContent, rawData.indexes);
        } else {
          doc
            .fontSize(10.5)
            .fillColor(this.COLORS.TEXT)
            .lineGap(4)
            .text(cleanContent, { align: 'justify' });
        }

        // ===== HALAMAN 3: SUMBER TERDETEKSI (JIKA ADA) =====
        if (
          includeDetailedResults &&
          rawData &&
          rawData.sources &&
          rawData.sources.filter((s) => s.score > 0).length > 0
        ) {
          doc.addPage();
          doc
            .font('Helvetica-Bold')
            .fontSize(16)
            .text('Detected Sources', { underline: true });
          doc.moveDown();

          const relevantSources = rawData.sources.filter((s) => s.score > 0);
          relevantSources.forEach((source) => {
            doc
              .roundedRect(doc.x, doc.y, doc.page.width - 100, 1, 0)
              .fill(this.COLORS.BORDER);
            doc.moveDown(1.5);
            doc
              .fillColor(this.COLORS.TEXT)
              .font('Helvetica-Bold')
              .fontSize(11)
              .text(source.title || 'Unknown Title');
            doc
              .fillColor(this.COLORS.PRIMARY)
              .fontSize(9)
              .text(source.url, { link: source.url, underline: true });
            doc.moveDown(0.5);
            doc
              .fillColor(this.COLORS.TEXT)
              .font('Helvetica')
              .text(
                `Match Score: ${source.score.toFixed(
                  2,
                )}%  |  Plagiarized Words: ${source.plagiarismWords}`,
              );
            doc.moveDown(2);
          });
        }

        // ===== FOOTER UNTUK SEMUA HALAMAN =====
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          if (i > 0 && logoPath) {
            // Header untuk halaman selanjutnya
            doc.image(logoPath, 50, 45, { width: 80 });
          }
          doc
            .fontSize(8)
            .fillColor(this.COLORS.SUBTLE_TEXT)
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
