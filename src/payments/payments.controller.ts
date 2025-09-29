import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('create-transaction')
  @ApiOperation({
    summary: 'Create payment transaction (Midtrans)',
    description:
      'Create a payment transaction for assignment activation or credit top-up. Returns Midtrans Snap token and payment URL.',
  })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      assignment: {
        summary: 'Assignment Payment',
        value: {
          amount: 25000,
          assignmentId: 'assignment-xyz',
        },
      },
      credit: {
        summary: 'Credit Top-up',
        value: {
          amount: 50000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created, Snap token and payment URL returned',
    schema: {
      example: {
        transactionId: 'trans-1',
        snapToken: 'snap-token-xyz',
        paymentUrl:
          'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz',
        status: 'PENDING',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or payment gateway error',
    schema: {
      example: { statusCode: 400, message: 'Amount must be greater than 0' },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not your assignment)',
    schema: { example: { statusCode: 403, message: 'Not your assignment' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Instructor or assignment not found',
    schema: { example: { statusCode: 404, message: 'Instructor not found' } },
  })
  async createTransaction(@Req() req, @Body() dto: CreateTransactionDto) {
    return this.paymentsService.createTransaction(dto, req.user.userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Midtrans payment webhook',
    description:
      'Endpoint for Midtrans to notify payment status. Validates signature and updates transaction/assignment status.',
  })
  @ApiBody({
    type: WebhookDto,
    examples: {
      settlement: {
        summary: 'Payment Success (settlement)',
        value: {
          order_id: 'PROTEXTIFY-1234567890-abc123',
          transaction_status: 'settlement',
          signature_key: 'valid_signature',
          status_code: '200',
          gross_amount: '25000.00',
          fraud_status: 'accept',
        },
      },
      expire: {
        summary: 'Payment Failed (expire)',
        value: {
          order_id: 'PROTEXTIFY-1234567890-abc123',
          transaction_status: 'expire',
          signature_key: 'valid_signature',
          status_code: '407',
          gross_amount: '25000.00',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { example: { message: 'Webhook processed successfully' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or missing data',
    schema: { example: { statusCode: 400, message: 'Invalid signature' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
    schema: { example: { statusCode: 404, message: 'Transaction not found' } },
  })
  async handleWebhook(@Body() dto: WebhookDto) {
    try {
      console.log('[WEBHOOK CONTROLLER] Received webhook request');
      const result = await this.paymentsService.handleWebhook(dto);
      console.log('[WEBHOOK CONTROLLER] Webhook processed successfully');
      return result;
    } catch (error) {
      console.error('[WEBHOOK CONTROLLER] Error processing webhook:', error);
      // Return success response even if there's an error to prevent Midtrans retry
      return {
        message: 'Webhook received',
        status: 'error',
        error: error.message,
      };
    }
  }
}
