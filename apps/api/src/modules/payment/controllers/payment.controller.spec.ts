import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('PaymentController (Unit Tests - DEF-007)', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    initiatePayment: jest.fn().mockResolvedValue({
      razorpay_order_id: 'order_123',
      razorpay_key_id: 'key_123',
      amount_paise: 149900,
      amount_inr: 1499,
      payment_order_id: 'po_123',
    }),
    handleWebhook: jest.fn().mockResolvedValue({ status: 'ok', message: 'Payment marked as success' }),
    getPaymentStatus: jest.fn().mockResolvedValue({
      order_id: 'order_123',
      status: 'PAYMENT_SUCCESS',
      booking_id: 'book_123',
      amount_inr: 1499,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /initiate calls paymentService.initiatePayment and wraps response', async () => {
    const req = { user: { id: 'cust_123' } };
    const dto = { bookingDraftId: 'draft_1', amountInr: 1499 };
    const res = await controller.initiatePayment(req, dto);

    expect(res.success).toBe(true);
    expect(res.data.razorpay_order_id).toBe('order_123');
    expect(service.initiatePayment).toHaveBeenCalledWith('cust_123', dto);
  });

  it('POST /webhook passes rawBody and signature to paymentService.handleWebhook', async () => {
    const rawBodyBuffer = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const req = { rawBody: rawBodyBuffer };
    const signature = 'sig_123';
    const payload = { event: 'payment.captured' };

    const res = await controller.handleWebhook(req as any, signature, payload);
    expect(res.status).toBe('ok');
    expect(service.handleWebhook).toHaveBeenCalledWith(
      rawBodyBuffer.toString('utf8'),
      signature,
      payload,
    );
  });

  it('GET /status/:order_id calls paymentService.getPaymentStatus with customer ID', async () => {
    const req = { user: { id: 'cust_123' } };
    const res = await controller.getPaymentStatus(req, 'order_123');

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('PAYMENT_SUCCESS');
    expect(service.getPaymentStatus).toHaveBeenCalledWith('order_123', 'cust_123');
  });
});
