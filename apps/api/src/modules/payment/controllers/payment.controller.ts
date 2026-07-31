import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';
import { InitiatePaymentDto, RazorpayWebhookDto } from '../dto/payment.dto';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** POST /api/v1/payments/initiate - Customer auth */
  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async initiatePayment(@Req() req: any, @Body() dto: InitiatePaymentDto) {
    const customerId = req.user.id || req.user.userId || req.user.sub;
    const result = await this.paymentService.initiatePayment(customerId, dto);
    return {
      success: true,
      data: result,
    };
  }

  /** POST /api/v1/payments/webhook - HMAC verified Razorpay webhook */
  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
    @Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false })) payload: any,
  ) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(payload || {});
    const result = await this.paymentService.handleWebhook(rawBody, signature, payload);
    return result;
  }

  /** GET /api/v1/payments/status/:order_id - Status check endpoint */
  @Get('status/:order_id')
  async getPaymentStatus(@Param('order_id') orderId: string) {
    const result = await this.paymentService.getPaymentStatus(orderId);
    return {
      success: true,
      data: result,
    };
  }
}
