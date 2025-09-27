import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import axios from 'axios';
import * as crypto from 'crypto';

// Interface untuk response Midtrans
interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
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
    let assignment: any = null; // Ubah tipe ke any
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

    // Buat transaksi di database
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: instructorId,
        amount: dto.amount,
        creditsPurchased: dto.credits ?? 0,
        status: 'PENDING',
        midtransOrderId: `TRX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        assignmentId: dto.assignmentId,
      },
    });

    // Konfigurasi Midtrans
    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!midtransServerKey) {
      throw new InternalServerErrorException(
        'MIDTRANS_SERVER_KEY is not configured',
      );
    }

    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Siapkan payload sesuai dokumentasi Midtrans
    const payload = {
      transaction_details: {
        order_id: transaction.midtransOrderId,
        gross_amount: dto.amount,
      },
      item_details: [
        {
          id: dto.assignmentId ?? 'CREDIT_TOPUP',
          price: dto.amount,
          quantity: 1,
          name: dto.assignmentId
            ? `Assignment Payment - ${assignment?.title || 'Assignment'}`
            : 'Credit Topup',
          category: dto.assignmentId ? 'Assignment' : 'Credit',
        },
      ],
      customer_details: {
        first_name: instructor.fullName?.split(' ')[0] || 'Instructor',
        last_name: instructor.fullName?.split(' ').slice(1).join(' ') || '',
        email: instructor.email,
        phone: instructor.phone || '+6281234567890',
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
        finish: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/finish`,
        error: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/error`,
      },
      expiry: {
        duration: 1,
        unit: 'day',
      },
    };

    try {
      const response = await axios.post<MidtransSnapResponse>(
        midtransUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
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

      // Perbaikan error handling tanpa AxiosError
      if (error.response) {
        const errorMessage =
          error.response?.data?.error_messages?.join(', ') ||
          error.response?.data?.message ||
          'Failed to create transaction with Midtrans';

        throw new BadRequestException(errorMessage);
      }

      throw new InternalServerErrorException('Failed to create transaction');
    }
  }

  async handleWebhook(dto: WebhookDto) {
    this.logger.log(`[WEBHOOK] Received webhook for order: ${dto.order_id}`);

    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;

    if (!midtransServerKey) {
      this.logger.error('[WEBHOOK] MIDTRANS_SERVER_KEY not configured');
      throw new InternalServerErrorException(
        'MIDTRANS_SERVER_KEY is not configured',
      );
    }

    // Validasi input
    if (!dto.order_id) {
      this.logger.error('[WEBHOOK] order_id is missing');
      throw new BadRequestException('order_id is required');
    }

    this.logger.log(
      `[WEBHOOK] Looking for transaction with order_id: ${dto.order_id}`,
    );

    // Cari transaksi
    const transaction = await this.prisma.transaction.findUnique({
      where: { midtransOrderId: dto.order_id },
    });

    if (!transaction) {
      this.logger.error(`[WEBHOOK] Transaction not found: ${dto.order_id}`);
      throw new NotFoundException('Transaction not found');
    }

    this.logger.log(`[WEBHOOK] Transaction found: ${transaction.id}`);

    // Validasi signature key sesuai dokumentasi Midtrans
    const signatureKey = dto.signature_key;
    const orderId = dto.order_id;
    const statusCode = dto.status_code || '200';

    // PERBAIKAN: Gunakan gross_amount dari webhook payload, bukan dari database
    const grossAmount =
      dto.gross_amount || Math.floor(transaction.amount).toString();

    const signatureString =
      orderId + statusCode + grossAmount + midtransServerKey;
    this.logger.log(`[WEBHOOK] Signature string: ${signatureString}`);

    const expectedSignature = crypto
      .createHash('sha512')
      .update(signatureString)
      .digest('hex');

    this.logger.log(`[WEBHOOK] Expected signature: ${expectedSignature}`);
    this.logger.log(`[WEBHOOK] Received signature: ${signatureKey}`);

    // Untuk signature mismatch - hanya log error, bukan detail signature
    if (signatureKey !== expectedSignature) {
      this.logger.error(
        `[WEBHOOK] Invalid signature for order: ${dto.order_id}`,
      );
      throw new ForbiddenException('Invalid signature');
    }

    // Map status Midtrans ke status aplikasi
    let newStatus: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';

    switch (dto.transaction_status) {
      case 'capture':
      case 'settlement':
        newStatus = 'SUCCESS';
        break;
      case 'cancel':
      case 'deny':
      case 'expire':
      case 'failure':
        newStatus = 'FAILED';
        break;
      case 'pending':
      default:
        newStatus = 'PENDING';
        break;
    }

    this.logger.log(`[WEBHOOK] Updating transaction status to: ${newStatus}`);

    // Update status transaksi
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: newStatus },
    });

    // Jika pembayaran sukses dan untuk assignment
    if (newStatus === 'SUCCESS' && transaction.assignmentId) {
      this.logger.log(
        `[WEBHOOK] Activating assignment: ${transaction.assignmentId}`,
      );
      await this.prisma.assignment.update({
        where: { id: transaction.assignmentId },
        data: { active: true },
      });
    }

    // Jika pembayaran sukses dan untuk kredit
    if (newStatus === 'SUCCESS' && transaction.creditsPurchased > 0) {
      this.logger.log(
        `[WEBHOOK] Adding ${transaction.creditsPurchased} credits to user: ${transaction.userId}`,
      );
      await this.prisma.$transaction(async (tx) => {
        const existingBalance = await tx.creditBalance.findUnique({
          where: { userId: transaction.userId },
        });

        if (existingBalance) {
          await tx.creditBalance.update({
            where: { userId: transaction.userId },
            data: {
              credits: existingBalance.credits + transaction.creditsPurchased,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.creditBalance.create({
            data: {
              userId: transaction.userId,
              credits: transaction.creditsPurchased,
            },
          });
        }
      });
    }

    // Kirim notifikasi WebSocket
    this.realtimeGateway.sendNotification(transaction.userId, {
      type: 'payment_status',
      message: `Payment ${dto.transaction_status} for order ${dto.order_id}`,
      data: {
        transactionId: transaction.id,
        status: newStatus,
        assignmentId: transaction.assignmentId,
        credits: transaction.creditsPurchased,
      },
      createdAt: new Date().toISOString(),
    });

    this.logger.log(
      `[WEBHOOK] Successfully processed: ${dto.order_id} -> ${newStatus}`,
    );

    if (newStatus === 'SUCCESS' && transaction.assignmentId) {
      this.logger.log(
        `[WEBHOOK] Assignment activated: ${transaction.assignmentId}`,
      );
    }
  }
}
