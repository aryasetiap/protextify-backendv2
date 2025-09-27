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

// 🔧 Interface untuk response Midtrans
interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
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

      // Update status transaksi
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: newStatus },
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
}
