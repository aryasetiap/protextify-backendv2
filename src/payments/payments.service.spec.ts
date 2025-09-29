import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('axios', () => ({
  post: jest.fn(() =>
    Promise.resolve({
      data: { token: 'snap-token', redirect_url: 'https://pay.url' },
    }),
  ),
}));
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'valid-signature'),
  })),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: jest.Mocked<PrismaService>;
  let config: jest.Mocked<ConfigService>;
  let realtime: jest.Mocked<RealtimeGateway>;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      assignment: { findUnique: jest.fn(), update: jest.fn() }, // Add update method
      transaction: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
    } as any;
    config = {
      get: jest.fn((key: string) => {
        if (key === 'MIDTRANS_SERVER_KEY') return 'server-key';
        if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
        if (key === 'FRONTEND_URL') return 'http://frontend';
        return undefined;
      }),
    } as any;
    realtime = { sendNotification: jest.fn() } as any;
    service = new PaymentsService(prisma, config, realtime);
  });

  describe('createTransaction', () => {
    it('should throw BadRequestException if amount invalid', async () => {
      await expect(
        service.createTransaction({ amount: 0 }, 'uid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if instructor not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createTransaction({ amount: 1000 }, 'uid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        fullName: 'Test',
        email: 'test@mail.com',
      });
      prisma.assignment.findUnique.mockResolvedValue(null);
      await expect(
        service.createTransaction({ amount: 1000, assignmentId: 'aid' }, 'uid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if assignment not owned', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        fullName: 'Test',
        email: 'test@mail.com',
      });
      prisma.assignment.findUnique.mockResolvedValue({
        id: 'aid',
        class: { instructorId: 'other' },
      });
      await expect(
        service.createTransaction({ amount: 1000, assignmentId: 'aid' }, 'uid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create transaction and return payment data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        fullName: 'Test User',
        email: 'test@mail.com',
        phone: '08123456789',
      });
      prisma.assignment.findUnique.mockResolvedValue({
        id: 'aid',
        title: 'Assignment',
        class: { instructorId: 'uid' },
      });
      prisma.transaction.create.mockResolvedValue({
        id: 'tid',
        status: 'PENDING',
      });
      prisma.transaction.update.mockResolvedValue({});
      const result = await service.createTransaction(
        { amount: 1000, assignmentId: 'aid' },
        'uid',
      );
      expect(result.snapToken).toBe('snap-token');
      expect(result.paymentUrl).toBe('https://pay.url');
      expect(result.status).toBe('PENDING');
    });

    it('should handle Midtrans API error and delete transaction', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValueOnce({
        response: { data: { error_messages: ['err'] } },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        fullName: 'Test User',
        email: 'test@mail.com',
        phone: '08123456789',
      });
      prisma.assignment.findUnique.mockResolvedValue({
        id: 'aid',
        title: 'Assignment',
        class: { instructorId: 'uid' },
      });
      prisma.transaction.create.mockResolvedValue({
        id: 'tid',
        status: 'PENDING',
      });
      prisma.transaction.delete.mockResolvedValue({});
      await expect(
        service.createTransaction({ amount: 1000, assignmentId: 'aid' }, 'uid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateSignature', () => {
    it('should return valid signature', () => {
      const result = service['validateSignature'](
        'oid',
        '200',
        '1000',
        'server-key',
      );
      expect(result).toBe('valid-signature');
    });
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException if missing required data', async () => {
      config.get.mockReturnValueOnce('server-key');
      await expect(
        service.handleWebhook({
          order_id: 'oid',
          status_code: '',
          gross_amount: '',
          transaction_status: '',
          signature_key: '',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if signature invalid', async () => {
      config.get.mockReturnValue('server-key');
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tid',
        assignment: { title: 'A', class: { instructorId: 'uid' } },
        userId: 'uid',
      });
      const spy = jest
        .spyOn(service as any, 'validateSignature')
        .mockReturnValue('not-match');
      await expect(
        service.handleWebhook({
          order_id: 'oid',
          status_code: '200',
          gross_amount: '1000',
          transaction_status: 'settlement',
          signature_key: 'wrong',
        } as any),
      ).rejects.toThrow(BadRequestException);
      spy.mockRestore();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      config.get.mockReturnValue('server-key');
      prisma.transaction.findUnique.mockResolvedValue(null);
      const spy = jest
        .spyOn(service as any, 'validateSignature')
        .mockReturnValue('valid-signature');
      await expect(
        service.handleWebhook({
          order_id: 'oid',
          status_code: '200',
          gross_amount: '1000',
          transaction_status: 'settlement',
          signature_key: 'valid-signature',
        } as any),
      ).rejects.toThrow(NotFoundException);
      spy.mockRestore();
    });

    it('should update transaction and activate assignment on success', async () => {
      config.get.mockReturnValue('server-key');
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tid',
        assignment: { id: 'aid', title: 'A', class: { instructorId: 'uid' } },
        assignmentId: 'aid',
        userId: 'uid',
        amount: 1000,
      });
      prisma.transaction.update.mockResolvedValue({});
      prisma.assignment.update.mockResolvedValue({});
      const spy = jest
        .spyOn(service as any, 'validateSignature')
        .mockReturnValue('valid-signature');
      const result = await service.handleWebhook({
        order_id: 'oid',
        status_code: '200',
        gross_amount: '1000',
        transaction_status: 'settlement',
        signature_key: 'valid-signature',
        fraud_status: 'accept',
      } as any);
      expect(prisma.transaction.update).toHaveBeenCalled();
      expect(prisma.assignment.update).toHaveBeenCalled();
      expect(realtime.sendNotification).toHaveBeenCalledWith(
        'uid',
        expect.objectContaining({ type: 'payment_success' }),
      );
      expect(result.message).toBe('Webhook processed successfully');
      spy.mockRestore();
    });

    it('should send payment_failed notification on failed payment', async () => {
      config.get.mockReturnValue('server-key');
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tid',
        assignment: { id: 'aid', title: 'A', class: { instructorId: 'uid' } },
        assignmentId: 'aid',
        userId: 'uid',
        amount: 1000,
      });
      prisma.transaction.update.mockResolvedValue({});
      const spy = jest
        .spyOn(service as any, 'validateSignature')
        .mockReturnValue('valid-signature');
      const result = await service.handleWebhook({
        order_id: 'oid',
        status_code: '200',
        gross_amount: '1000',
        transaction_status: 'cancel',
        signature_key: 'valid-signature',
      } as any);
      expect(realtime.sendNotification).toHaveBeenCalledWith(
        'uid',
        expect.objectContaining({ type: 'payment_failed' }),
      );
      expect(result.message).toBe('Webhook processed successfully');
      spy.mockRestore();
    });
  });
});
