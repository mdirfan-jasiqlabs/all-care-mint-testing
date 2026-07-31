import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';

@Controller('api/v1/providers/me/earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderEarningsController {
  constructor(private readonly paymentService: PaymentService) {}

  /** GET /api/v1/providers/me/earnings - Provider earnings breakdown */
  @Get()
  async getEarnings(@Req() req: any) {
    const providerId = req.user.id || req.user.userId || req.user.sub;
    const result = await this.paymentService.getProviderEarnings(providerId);
    return {
      success: true,
      data: result,
    };
  }
}
