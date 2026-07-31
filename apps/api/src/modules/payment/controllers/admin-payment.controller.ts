import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';
import { AdminPaymentsQueryDto } from '../dto/payment.dto';

@Controller('api/v1/admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** GET /api/v1/admin/payments - Paginated payments ledger with CSV export */
  @Get()
  async getAdminPayments(
    @Query() query: AdminPaymentsQueryDto,
    @Res({ passthrough: true }) res: any,
  ) {
    if (query.format === 'csv') {
      const csvData = (await this.paymentService.getAdminPayments(query)) as string;
      if (res.header) {
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="payments-report.csv"');
      } else if (res.setHeader) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="payments-report.csv"');
      }
      return csvData;
    }

    const result = await this.paymentService.getAdminPayments(query);
    return {
      success: true,
      data: result,
    };
  }

  /** PATCH /api/v1/admin/payments/:id/settle - Settle cash payment */
  @Patch(':id/settle')
  async settleCashPayment(@Param('id') paymentId: string) {
    const result = await this.paymentService.settleCashPayment(paymentId);
    return {
      success: true,
      data: result,
    };
  }
}
