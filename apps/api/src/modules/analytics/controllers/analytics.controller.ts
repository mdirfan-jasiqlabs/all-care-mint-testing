import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/metrics')
  async getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }

  @Get('reports')
  async getReports(
    @Query('type') type: string = 'booking',
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.analyticsService.getReports(type, dateFrom, dateTo, format);

    if (format === 'csv' && result.csv !== undefined) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${type}-${dateFrom || 'all'}-${dateTo || 'all'}.csv"`,
      );
      return res.send(result.csv);
    }

    return {
      type,
      date_from: dateFrom,
      date_to: dateTo,
      count: result.data.length,
      data: result.data,
    };
  }
}
