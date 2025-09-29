import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import axios from 'axios';
import * as crypto from 'crypto';

// Mock dependensi eksternal
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  assignment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'MIDTRANS_SERVER_KEY') return 'mock_server_key';
    if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
    if (key === 'FRONTEND_URL') return 'http://localhost:3000';
    return null;
  }),
};

const mockRealtimeGateway = {
  sendNotification: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: typeof mockPrismaService;
  let config: typeof mockConfigService;
  let gateway: typeof mockRealtimeGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get(PrismaService);
    config = module.get(ConfigService);
    gateway = module.get(RealtimeGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Pengujian untuk method createTransaction
  describe('createTransaction', () => {
    const instructorId = 'instructor-123';
    const mockInstructor = {
      id: instructorId,
      fullName: 'Budi Instruktur',
      email: 'budi@test.com',
    };
    // PERBAIKAN: Menambahkan properti 'title' pada mock assignment
    const mockAssignment = {
      id: 'asg-123',
      title: 'Tugas Awal',
      class: { instructorId },
    };
    const dto: CreateTransactionDto = {
      amount: 50000,
      assignmentId: 'asg-123',
    };
    const mockTransaction = { id: 'trans-1', status: 'PENDING' };

    // Kasus normal: berhasil membuat transaksi
    it('should create a transaction and return snap token', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockInstructor);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.transaction.create.mockResolvedValue(mockTransaction);
      mockedAxios.post.mockResolvedValue({
        data: { token: 'snap-token', redirect_url: 'http://payment-url.com' },
      });

      // Act
      const result = await service.createTransaction(dto, instructorId);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: instructorId },
      });
      expect(prisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: dto.assignmentId },
        include: { class: true },
      });
      expect(prisma.transaction.create).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: mockTransaction.id },
        data: { midtransToken: 'snap-token' },
      });
      expect(result).toEqual({
        transactionId: mockTransaction.id,
        snapToken: 'snap-token',
        paymentUrl: 'http://payment-url.com',
        status: 'PENDING',
      });
    });

    // Error handling: amount tidak valid
    it('should throw BadRequestException for invalid amount', async () => {
      await expect(
        service.createTransaction({ amount: 0 }, instructorId),
      ).rejects.toThrow(BadRequestException);
    });

    // Error handling: instruktur tidak ditemukan
    it('should throw NotFoundException if instructor not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createTransaction(dto, instructorId),
      ).rejects.toThrow(NotFoundException);
    });

    // Error handling: assignment bukan milik instruktur
    it('should throw ForbiddenException if assignment does not belong to instructor', async () => {
      prisma.user.findUnique.mockResolvedValue(mockInstructor);
      prisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        class: { instructorId: 'other-instructor' },
      });
      await expect(
        service.createTransaction(dto, instructorId),
      ).rejects.toThrow(ForbiddenException);
    });

    // Error handling: Gagal saat request ke Midtrans
    it('should delete transaction if Midtrans API call fails', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockInstructor);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.transaction.create.mockResolvedValue(mockTransaction);
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));
      // PERBAIKAN: Pastikan mock `delete` mengembalikan objek yang memiliki method `.catch()`
      prisma.transaction.delete.mockReturnValue({
        catch: jest.fn(),
      } as any);

      // Act & Assert
      await expect(
        service.createTransaction(dto, instructorId),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: mockTransaction.id },
      });
    });
  });

  // Pengujian untuk method handleWebhook
  describe('handleWebhook', () => {
    const order_id = 'order-123';
    const serverKey = 'mock_server_key';

    // Membuat signature yang valid untuk test
    const createSignature = (orderId, statusCode, grossAmount, key) => {
      return crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + key)
        .digest('hex');
    };

    const mockTransaction = {
      id: 'trans-1',
      userId: 'user-abc',
      assignmentId: 'asg-123',
      amount: 10000,
      assignment: { title: 'Tugas Kalkulus' },
    };

    // Kasus normal: pembayaran sukses (settlement)
    it('should process a successful settlement webhook and activate assignment', async () => {
      const dto: WebhookDto = {
        order_id,
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '10000.00',
        signature_key: createSignature(order_id, '200', '10000.00', serverKey),
        fraud_status: 'accept',
      };

      // Arrange
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      // Act
      await service.handleWebhook(dto);

      // Assert
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: mockTransaction.id },
        data: { status: 'SUCCESS' },
      });
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: mockTransaction.assignmentId },
        data: { active: true },
      });
      expect(gateway.sendNotification).toHaveBeenCalledWith(
        mockTransaction.userId,
        expect.objectContaining({ type: 'payment_success' }),
      );
    });

    // Kasus normal: pembayaran gagal (expire)
    it('should process a failed (expire) webhook', async () => {
      const dto: WebhookDto = {
        order_id,
        transaction_status: 'expire',
        status_code: '407',
        gross_amount: '10000.00',
        signature_key: createSignature(order_id, '407', '10000.00', serverKey),
      };

      // Arrange
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      // Act
      await service.handleWebhook(dto);

      // Assert
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: mockTransaction.id },
        data: { status: 'FAILED' },
      });
      expect(gateway.sendNotification).toHaveBeenCalledWith(
        mockTransaction.userId,
        expect.objectContaining({ type: 'payment_failed' }),
      );
      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });

    // Error handling: signature tidak valid
    it('should throw BadRequestException for invalid signature', async () => {
      const dto: WebhookDto = {
        order_id,
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '10000.00',
        signature_key: 'invalid_signature',
      };
      await expect(service.handleWebhook(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Error handling: transaksi tidak ditemukan
    it('should throw NotFoundException if transaction not found', async () => {
      const dto: WebhookDto = {
        order_id,
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '10000.00',
        signature_key: createSignature(order_id, '200', '10000.00', serverKey),
      };
      prisma.transaction.findUnique.mockResolvedValue(null);
      await expect(service.handleWebhook(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
