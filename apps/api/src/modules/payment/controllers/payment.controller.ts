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
    @Req() req: RawBodyRequest<any>,
    @Headers('x-razorpay-signature') signature: string,
    @Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false })) payload: any,
  ) {
    const rawBodyBuffer = req.rawBody || req.body;
    const rawBodyStr = Buffer.isBuffer(rawBodyBuffer)
      ? rawBodyBuffer.toString('utf8')
      : typeof rawBodyBuffer === 'string'
      ? rawBodyBuffer
      : JSON.stringify(payload || {});
    const result = await this.paymentService.handleWebhook(rawBodyStr, signature, payload);
    return result;
  }

  /** GET /api/v1/payments/status/:order_id - Status check endpoint (Customer Auth & Ownership protected) */
  @Get('status/:order_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async getPaymentStatus(@Req() req: any, @Param('order_id') orderId: string) {
    const customerId = req.user.id || req.user.userId || req.user.sub;
    const result = await this.paymentService.getPaymentStatus(orderId, customerId);
    return {
      success: true,
      data: result,
    };
  }
}
