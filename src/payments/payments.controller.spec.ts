import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createTransaction: jest.fn(),
            handleWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should call createTransaction', async () => {
    (service.createTransaction as jest.Mock).mockResolvedValue({
      transactionId: 'tid',
      snapToken: 'token',
      paymentUrl: 'url',
      status: 'PENDING',
    });
    const req = { user: { userId: 'uid' } };
    const dto = { amount: 1000, assignmentId: 'aid' };
    const result = await controller.createTransaction(req, dto as any);
    expect(service.createTransaction).toHaveBeenCalledWith(dto, 'uid');
    expect(result.transactionId).toBe('tid');
  });

  it('should call handleWebhook and return result', async () => {
    (service.handleWebhook as jest.Mock).mockResolvedValue({
      message: 'Webhook processed successfully',
    });
    const dto = {
      order_id: 'oid',
      status_code: '200',
      gross_amount: '1000',
      transaction_status: 'settlement',
      signature_key: 'sig',
    };
    const result = await controller.handleWebhook(dto as any);
    expect(service.handleWebhook).toHaveBeenCalledWith(dto);
    expect(result.message).toBe('Webhook processed successfully');
  });

  it('should handle error in webhook and return error response', async () => {
    (service.handleWebhook as jest.Mock).mockRejectedValue(new Error('fail'));
    const dto = {
      order_id: 'oid',
      status_code: '200',
      gross_amount: '1000',
      transaction_status: 'settlement',
      signature_key: 'sig',
    };
    const result = await controller.handleWebhook(dto as any);
    expect(result.status).toBe('error');
    expect(result.message).toBe('Webhook received');
    expect(result.error).toBe('fail');
  });
});
