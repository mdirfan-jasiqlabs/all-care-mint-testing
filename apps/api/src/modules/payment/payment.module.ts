import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { ProviderEarningsController } from './controllers/provider-earnings.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PaymentController,
    AdminPaymentController,
    ProviderEarningsController,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
