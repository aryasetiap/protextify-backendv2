import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  @Post('create-transaction')
  async createTransaction(@Req() req, @Body() dto: CreateTransactionDto) {
    return this.paymentsService.createTransaction(dto, req.user.userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
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
