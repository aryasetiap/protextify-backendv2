import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import axios from 'axios';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import PDFDocument from 'pdfkit';
import { ExportTransactionsDto } from './dto/export-transactions.dto';
import * as path from 'path';
import * as fs from 'fs';

// 🔧 Interface untuk response Midtrans
interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

interface TransactionQuery {
  page: number;
  limit: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  assignmentId?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
  ) {}

  async createTransaction(dto: CreateTransactionDto, instructorId: string) {
    // Validasi input
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Ambil data instructor
    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Validasi assignment jika ada assignmentId
    let assignment: any = null;
    if (dto.assignmentId) {
      assignment = await this.prisma.assignment.findUnique({
        where: { id: dto.assignmentId },
        include: { class: true },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      if (assignment.class.instructorId !== instructorId) {
        throw new ForbiddenException('Not your assignment');
      }
    }

    // Generate unique order ID
    const orderId = `PROTEXTIFY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Buat transaksi di database
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        status: 'PENDING',
        midtransTransactionId: orderId,
        userId: instructorId,
        assignmentId: dto.assignmentId || null,
        creditsPurchased: 0,
      },
    });

    try {
      // 🔧 Validasi Midtrans Configuration
      const midtransServerKey = this.configService.get<string>(
        'MIDTRANS_SERVER_KEY',
      );
      const isProduction =
        this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';

      if (!midtransServerKey) {
        throw new BadRequestException('Midtrans server key not configured');
      }

      // 🔧 Perbaikan: Definisikan midtransUrl dengan benar
      const midtransUrl = isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

      this.logger.log(`Using Midtrans URL: ${midtransUrl}`);
      this.logger.log(`Is Production: ${isProduction}`);
      this.logger.log(
        `Server Key Prefix: ${midtransServerKey.substring(0, 15)}...`,
      );

      // Format payload Midtrans
      const itemName = assignment
        ? `Assignment: ${assignment.title.substring(0, 30)}...`
        : 'Credit Top-up';

      const midtransPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: dto.amount,
        },
        item_details: [
          {
            id: dto.assignmentId || 'CREDIT_TOPUP',
            price: dto.amount,
            quantity: 1,
            name: itemName.substring(0, 50),
            category: assignment ? 'Assignment Payment' : 'Credit',
            merchant_name: 'Protextify',
          },
        ],
        customer_details: {
          first_name: instructor.fullName.split(' ')[0] || 'User',
          last_name: instructor.fullName.split(' ').slice(1).join(' ') || '',
          email: instructor.email,
          phone: instructor.phone || '08123456789',
        },
        enabled_payments: [
          'credit_card',
          'bca_va',
          'bni_va',
          'bri_va',
          'echannel',
          'permata_va',
          'other_va',
          'gopay',
          'shopeepay',
        ],
        callbacks: {
          finish: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          error: `${this.configService.get('FRONTEND_URL')}/payment/error`,
          pending: `${this.configService.get('FRONTEND_URL')}/payment/pending`,
        },
        expiry: {
          unit: 'minutes',
          duration: 60,
        },
      };

      console.log(
        'Midtrans Payload:',
        JSON.stringify(midtransPayload, null, 2),
      );

      // 🔧 Kirim ke Midtrans dengan proper authorization
      const response = await axios.post<MidtransSnapResponse>(
        midtransUrl, // ✅ Sekarang sudah terdefinisi dengan benar
        midtransPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${midtransServerKey}:`).toString('base64')}`,
          },
          timeout: 30000,
        },
      );

      // Update transaction dengan token
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          midtransToken: response.data.token,
        },
      });

      return {
        transactionId: transaction.id,
        snapToken: response.data.token,
        paymentUrl: response.data.redirect_url,
        status: transaction.status,
      };
    } catch (error: any) {
      console.error('Midtrans API Error:', error);

      // Hapus transaksi yang gagal
      await this.prisma.transaction
        .delete({
          where: { id: transaction.id },
        })
        .catch(() => {
          // Ignore delete error
        });

      // Error handling
      if (error.response) {
        const midtransError = error.response.data;
        console.error('Midtrans Error Details:', midtransError);

        throw new BadRequestException(
          `Payment gateway error: ${midtransError.error_messages?.join(', ') || midtransError.message || 'Unknown error'}`,
        );
      } else if (error.request) {
        throw new BadRequestException('Failed to connect to payment gateway');
      } else {
        throw new BadRequestException(
          `Payment processing error: ${error.message}`,
        );
      }
    }
  }

  // Method untuk validasi webhook signature
  private validateSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    serverKey: string,
  ): string {
    const input = orderId + statusCode + grossAmount + serverKey;
    return crypto.createHash('sha512').update(input).digest('hex');
  }

  async handleWebhook(dto: WebhookDto) {
    try {
      console.log('Received webhook:', JSON.stringify(dto, null, 2));

      const {
        order_id,
        transaction_status,
        fraud_status,
        signature_key,
        status_code,
        gross_amount,
      } = dto;

      // Validasi signature untuk keamanan dengan null check
      const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
      if (!serverKey || !status_code || !gross_amount) {
        throw new BadRequestException('Missing required webhook data');
      }

      const expectedSignature = this.validateSignature(
        order_id,
        status_code,
        gross_amount,
        serverKey,
      );

      if (signature_key !== expectedSignature) {
        throw new BadRequestException('Invalid signature');
      }

      // Cari transaksi dengan field yang benar dan include assignment
      const transaction = await this.prisma.transaction.findUnique({
        where: { midtransTransactionId: order_id },
        include: {
          assignment: {
            include: { class: true },
          },
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      let newStatus: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';

      // Tentukan status berdasarkan response Midtrans
      if (
        transaction_status === 'capture' ||
        transaction_status === 'settlement'
      ) {
        if (fraud_status === 'accept' || !fraud_status) {
          newStatus = 'SUCCESS';
        }
      } else if (
        transaction_status === 'cancel' ||
        transaction_status === 'deny' ||
        transaction_status === 'expire' ||
        transaction_status === 'failure'
      ) {
        newStatus = 'FAILED';
      }

      // Update status transaksi dengan paymentMethod jika field ditambahkan
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          paymentMethod: dto.payment_type, // 🆕 Simpan metode pembayaran dari Midtrans
        },
      });

      // Jika pembayaran sukses dan ini untuk assignment
      if (
        newStatus === 'SUCCESS' &&
        transaction.assignment &&
        transaction.assignmentId
      ) {
        // Aktifkan assignment dengan null check
        await this.prisma.assignment.update({
          where: { id: transaction.assignmentId },
          data: { active: true },
        });

        // Log activity
        await this.prisma.classActivity.create({
          data: {
            classId: transaction.assignment.classId,
            type: 'ASSIGNMENT_CREATED',
            details: {
              assignmentTitle: transaction.assignment.title,
            },
            actorId: transaction.userId,
          },
        });

        // Kirim notifikasi WebSocket dengan data yang benar
        this.realtimeGateway.sendNotification(transaction.userId, {
          type: 'payment_success',
          message: `Payment successful! Assignment "${transaction.assignment.title}" is now active.`,
          data: {
            transactionId: transaction.id,
            assignmentId: transaction.assignmentId,
            amount: transaction.amount,
          },
          createdAt: new Date().toISOString(),
        });
      } else if (newStatus === 'FAILED') {
        // Kirim notifikasi kegagalan
        this.realtimeGateway.sendNotification(transaction.userId, {
          type: 'payment_failed',
          message: 'Payment failed. Please try again.',
          data: {
            transactionId: transaction.id,
            reason: transaction_status,
          },
          createdAt: new Date().toISOString(),
        });
      }

      return { message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  async getTransactionById(transactionId: string, instructorId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        assignment: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== instructorId) {
      throw new ForbiddenException(
        'You do not have permission to view this transaction',
      );
    }

    // Construct payment history
    const paymentHistory = [
      {
        status: 'PENDING',
        timestamp: transaction.createdAt.toISOString(),
      },
    ];

    if (transaction.status !== 'PENDING') {
      paymentHistory.push({
        status: transaction.status,
        timestamp: transaction.updatedAt.toISOString(),
      });
    }

    return {
      id: transaction.id,
      orderId: transaction.midtransTransactionId,
      amount: transaction.amount,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      expectedStudentCount:
        transaction.assignment?.expectedStudentCount || null,
      assignment: transaction.assignment
        ? {
            id: transaction.assignment.id,
            title: transaction.assignment.title,
            deadline: transaction.assignment.deadline?.toISOString() || null,
            class: transaction.assignment.class,
          }
        : null,
      paymentHistory,
    };
  }

  private async generateInvoicePdf(
    transactionId: string,
    instructorId: string,
  ): Promise<{ buffer: Buffer; transactionData: any }> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: { select: { fullName: true, email: true } },
        assignment: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
    });

    if (!transaction || transaction.userId !== instructorId) {
      throw new ForbiddenException('Transaction not found or access denied.');
    }

    const buffer = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header dengan background color dan logo area
      const headerHeight = 80;
      doc.rect(0, 0, 595, headerHeight) // 595 adalah lebar A4
         .fill('#2563eb'); // Blue background
      
      // Logo area - try multiple paths
      const possiblePaths = [
        path.join(process.cwd(), 'src/assets/logo-protextify-putih.png'),
        path.join(__dirname, '../assets/logo-protextify-putih.png'),
        path.join(__dirname, '../../assets/logo-protextify-putih.png'),
        path.join(process.cwd(), 'dist/src/assets/logo-protextify-putih.png'),
        path.join(process.cwd(), 'assets/logo-protextify-putih.png')
      ];
      
      let logoFound = false;
      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, 40, 20, { width: 70 });
            console.log('Logo loaded successfully from:', logoPath);
            logoFound = true;
            break;
          } catch (error) {
            console.log('Error loading logo from', logoPath, ':', error.message);
          }
        }
      }
      
      if (!logoFound) {
        console.log('Logo not found in any of the expected paths');
      }
      
      // Logo/Title area
      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('PROTEXTIFY', 120, 25, { align: 'left' });
      
      doc.fontSize(12)
         .text('Plagiarism Detection Platform', 120, 50, { align: 'left' });
      
      // Invoice title
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('INVOICE', 400, 30, { align: 'right' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .text('Payment Receipt', 400, 55, { align: 'right' });

      // Reset color
      doc.fillColor('#000000');

      // Invoice details section
      const startY = headerHeight + 30;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Invoice Details', 40, startY);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Invoice #: ${transaction.midtransTransactionId}`, 40, startY + 25)
         .text(`Date: ${transaction.createdAt.toLocaleDateString('id-ID', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         })}`, 40, startY + 40)
         .text(`Time: ${transaction.createdAt.toLocaleTimeString('id-ID', {
           hour: '2-digit',
           minute: '2-digit'
         })}`, 40, startY + 55);

      // Billed to section
      const billedToY = startY + 90;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Billed To', 40, billedToY);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(transaction.user.fullName, 40, billedToY + 20)
         .text(transaction.user.email, 40, billedToY + 35);

      // Service details section
      const serviceY = billedToY + 70;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Service Details', 40, serviceY);

      // Table header
      const tableY = serviceY + 25;
      doc.rect(40, tableY, 515, 25)
         .fill('#f8fafc'); // Light gray background
      
      doc.fillColor('#374151')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Description', 50, tableY + 8)
         .text('Amount', 450, tableY + 8, { align: 'right' });

      // Table content
      const contentY = tableY + 25;
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(10);
      
      const desc = transaction.assignment
        ? `Payment for Assignment: "${transaction.assignment.title}"`
        : 'Credit Top-up';
      
      // Wrap long descriptions
      const wrappedDesc = doc.text(desc, 50, contentY + 8, {
        width: 380,
        height: 30,
        ellipsis: true
      });
      
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
      }).format(transaction.amount);
      
      doc.text(amount, 450, contentY + 8, { align: 'right' });

      // Total section
      const totalY = contentY + 50;
      doc.rect(40, totalY, 515, 30)
         .fill('#1f2937'); // Dark background
      
      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL', 50, totalY + 10)
         .text(amount, 450, totalY + 10, { align: 'right' });

      // Status section
      const statusY = totalY + 50;
      doc.fillColor('#000000')
         .fontSize(11)
         .font('Helvetica-Bold');
      
      const statusColor = transaction.status === 'SUCCESS' ? '#10b981' : 
                         transaction.status === 'PENDING' ? '#f59e0b' : '#ef4444';
      
      doc.fillColor(statusColor)
         .text(`Status: ${transaction.status}`, 40, statusY, { align: 'right' });

      // Footer
      const footerY = 750;
      doc.fillColor('#6b7280')
         .fontSize(8)
         .font('Helvetica')
         .text('Thank you for using Protextify!', 40, footerY, { align: 'center' })
         .text('This is an automated invoice generated by our system.', 40, footerY + 15, { align: 'center' })
         .text('For support, contact us at support@protextify.com', 40, footerY + 30, { align: 'center' });

      // Add decorative border
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .rect(20, 20, 555, 755)
         .stroke();

      doc.end();
    });

    return { buffer, transactionData: transaction };
  }

  async downloadInvoice(transactionId: string, instructorId: string) {
    const { buffer, transactionData } = await this.generateInvoicePdf(
      transactionId,
      instructorId,
    );
    const filename = `invoice-${transactionData.midtransTransactionId}.pdf`;
    const cloudKey = `invoices/${filename}`;

    await this.storageService.uploadRawBuffer(
      buffer,
      cloudKey,
      'application/pdf',
    );

    const downloadUrl = await this.storageService.refreshDownloadUrl(
      cloudKey,
      filename,
      3600, // 1 hour expiry
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      filename,
    };
  }

  async emailInvoice(transactionId: string, instructorId: string) {
    const { buffer, transactionData } = await this.generateInvoicePdf(
      transactionId,
      instructorId,
    );

    await this.emailService.sendInvoiceEmail(
      transactionData.user.email,
      transactionData.user.fullName,
      {
        orderId: transactionData.midtransTransactionId,
        amount: transactionData.amount,
      },
      buffer,
    );

    return { message: 'Invoice successfully sent to your email.' };
  }

  async exportTransactions(dto: ExportTransactionsDto, instructorId: string) {
    const { status, startDate, endDate, search } = dto;

    const where: any = {
      userId: instructorId,
      ...(status && { status }),
      ...(startDate && endDate
        ? { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
        : startDate
          ? { createdAt: { gte: new Date(startDate) } }
          : endDate
            ? { createdAt: { lte: new Date(endDate) } }
            : {}),
    };

    if (search) {
      where.OR = [
        { assignment: { title: { contains: search, mode: 'insensitive' } } },
        {
          assignment: {
            class: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
    });

    if (transactions.length === 0) {
      throw new NotFoundException(
        'No transactions found matching the criteria.',
      );
    }

    const headers =
      'Order ID,Date,Amount,Status,Payment Method,Assignment Title,Class Name\n';
    const rows = transactions
      .map((tx) => {
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        return [
          tx.midtransTransactionId,
          tx.createdAt.toISOString(),
          tx.amount,
          tx.status,
          tx.paymentMethod || 'N/A',
          escapeCsv(tx.assignment?.title || 'Credit Top-up'),
          escapeCsv(tx.assignment?.class?.name || 'N/A'),
        ].join(',');
      })
      .join('\n');

    const csvBuffer = Buffer.from(headers + rows);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `protextify-transactions-export-${timestamp}.csv`;
    const cloudKey = `exports/${filename}`;

    await this.storageService.uploadRawBuffer(csvBuffer, cloudKey, 'text/csv');

    const downloadUrl = await this.storageService.refreshDownloadUrl(
      cloudKey,
      filename,
      3600, // Expires in 1 hour
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      filename,
    };
  }

  async getTransactionStatusByOrderId(orderId: string, instructorId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { midtransTransactionId: orderId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== instructorId) {
      throw new ForbiddenException(
        'You do not have permission to view this transaction',
      );
    }

    return {
      orderId: transaction.midtransTransactionId,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      paidAt:
        transaction.status === 'SUCCESS'
          ? transaction.updatedAt.toISOString()
          : null,
    };
  }

  async getTransactions(instructorId: string, query: TransactionQuery) {
    // 🔧 Pastikan page dan limit adalah number dengan default values
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50); // Max 50 per request
    const { status, startDate, endDate, assignmentId } = query;

    // 🔧 Validasi input
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    const where: any = {
      userId: instructorId,
      ...(status && { status }),
      ...(assignmentId && { assignmentId }),
      ...(startDate && endDate
        ? { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
        : startDate
          ? { createdAt: { gte: new Date(startDate) } }
          : endDate
            ? { createdAt: { lte: new Date(endDate) } }
            : {}),
    };

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, // 🔧 Pastikan operasi matematika dengan number
        take: limit, // 🔧 Sekarang sudah pasti number
        include: {
          assignment: {
            include: {
              class: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        orderId: tx.midtransTransactionId,
        amount: tx.amount,
        status: tx.status,
        paymentMethod: (tx as any).paymentMethod || 'bank_transfer',
        createdAt: tx.createdAt,
        assignment: tx.assignment
          ? {
              id: tx.assignment.id,
              title: tx.assignment.title,
              class: { name: tx.assignment.class?.name },
            }
          : null,
        expectedStudentCount: tx.assignment?.expectedStudentCount || null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
