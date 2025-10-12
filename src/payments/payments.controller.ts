import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Get,
  ParseIntPipe,
  DefaultValuePipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExportTransactionsDto } from './dto/export-transactions.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('transactions/:id')
  @ApiOperation({
    summary: 'Get transaction detail by ID',
    description: 'Retrieves full details for a single transaction.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction detail retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getTransactionById(@Param('id') id: string, @Req() req) {
    return this.paymentsService.getTransactionById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('transactions/:id/download-invoice')
  @ApiOperation({
    summary: 'Download transaction invoice as PDF',
    description:
      'Generates a PDF invoice for a transaction and returns a secure, time-limited download URL.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice download URL generated successfully.',
  })
  async downloadInvoice(@Param('id') id: string, @Req() req) {
    return this.paymentsService.downloadInvoice(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('transactions/:id/email-invoice')
  @ApiOperation({
    summary: 'Send transaction invoice to user email',
    description:
      'Generates a PDF invoice and sends it as an attachment to the instructor’s registered email.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully.' })
  async emailInvoice(@Param('id') id: string, @Req() req) {
    return this.paymentsService.emailInvoice(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('transactions/export')
  @ApiOperation({
    summary: 'Export transaction history to CSV',
    description:
      'Generates a CSV file of the instructor’s transaction history based on provided filters and returns a secure download URL.',
  })
  @ApiBody({
    type: ExportTransactionsDto,
    examples: {
      full: {
        summary: 'Export with all filters',
        value: {
          status: 'SUCCESS',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          search: 'Kalkulus',
        },
      },
      partial: {
        summary: 'Export with partial filters',
        value: {
          status: 'SUCCESS',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CSV export file generated successfully.',
    schema: {
      example: {
        downloadUrl:
          'https://storage.protextify.com/exports/transactions-export-xyz.csv',
        expiresAt: '2025-10-12T15:00:00Z',
        filename: 'protextify-transactions-export.csv',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'No transactions found for the given criteria.',
  })
  async exportTransactions(@Req() req, @Body() dto: ExportTransactionsDto) {
    return this.paymentsService.exportTransactions(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('status/:orderId')
  @ApiOperation({
    summary: 'Get payment transaction status by Order ID',
    description:
      'Checks the status of a specific payment transaction using its Order ID.',
  })
  @ApiParam({
    name: 'orderId',
    type: String,
    description: 'The Order ID from Midtrans (e.g., PROTEXTIFY-xxx)',
    example: 'PROTEXTIFY-1633867800000-abcdef123',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved successfully',
    schema: {
      example: {
        orderId: 'PROTEXTIFY-xxx',
        status: 'SUCCESS',
        paymentMethod: 'bank_transfer',
        paidAt: '2025-10-10T14:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getTransactionStatus(@Param('orderId') orderId: string, @Req() req) {
    return this.paymentsService.getTransactionStatusByOrderId(
      orderId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Get('transactions')
  @ApiOperation({
    summary: 'Get instructor transaction history',
    description:
      'Returns paginated transaction history for instructor with filters.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'SUCCESS',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2025-01-31',
  })
  @ApiQuery({
    name: 'assignmentId',
    required: false,
    type: String,
    example: 'assignment-xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transaction history',
    schema: {
      example: {
        data: [
          {
            id: 'transaction-id',
            orderId: 'PROTEXTIFY-xxx',
            amount: 25000,
            status: 'SUCCESS',
            paymentMethod: 'bank_transfer',
            createdAt: '2025-01-XX',
            assignment: {
              id: 'assignment-id',
              title: 'Assignment Title',
              class: { name: 'Class Name' },
            },
            expectedStudentCount: 10,
          },
        ],
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
      },
    },
  })
  async getTransactions(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignmentId') assignmentId?: string,
  ) {
    return this.paymentsService.getTransactions(req.user.userId, {
      page,
      limit,
      status,
      startDate,
      endDate,
      assignmentId,
    });
  }
}
