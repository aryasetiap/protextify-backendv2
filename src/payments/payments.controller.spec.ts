import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// Mockup untuk PaymentsService
const mockPaymentsService = {
  createTransaction: jest.fn(),
  handleWebhook: jest.fn(),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: typeof mockPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Pengujian untuk endpoint POST /payments/create-transaction
  describe('createTransaction', () => {
    it('should call service.createTransaction with correct parameters', async () => {
      // Arrange
      const dto: CreateTransactionDto = { amount: 25000 };
      const req = { user: { userId: 'instructor-123' } };
      const mockResult = { snapToken: 'some-token' };
      service.createTransaction.mockResolvedValue(mockResult);

      // Act
      const result = await controller.createTransaction(req, dto);

      // Assert
      expect(service.createTransaction).toHaveBeenCalledWith(
        dto,
        req.user.userId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  // Pengujian untuk endpoint POST /payments/webhook
  describe('handleWebhook', () => {
    const dto: WebhookDto = {
      order_id: 'test-order',
      transaction_status: 'settlement',
      signature_key: 'test-key',
      status_code: '200',
      gross_amount: '10000.00',
    };

    // Kasus normal: webhook berhasil diproses
    it('should call service.handleWebhook and return success message', async () => {
      // Arrange
      const mockResult = { message: 'Webhook processed successfully' };
      service.handleWebhook.mockResolvedValue(mockResult);

      // Act
      const result = await controller.handleWebhook(dto);

      // Assert
      expect(service.handleWebhook).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });

    // Error handling: terjadi error di service
    it('should catch errors from service and return a custom error response', async () => {
      // Arrange
      const error = new Error('Service error');
      service.handleWebhook.mockRejectedValue(error);

      // Act
      const result = await controller.handleWebhook(dto);

      // Assert
      expect(service.handleWebhook).toHaveBeenCalledWith(dto);
      // Controller harus menangkap error dan mengembalikan response agar Midtrans tidak retry
      expect(result).toEqual({
        message: 'Webhook received',
        status: 'error',
        error: error.message,
      });
    });
  });
});
