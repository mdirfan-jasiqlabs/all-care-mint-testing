import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
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
  async getDashboardMetrics(
    @Query('days') daysRaw?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const days = daysRaw ? Number(daysRaw) : undefined;
    return this.analyticsService.getDashboardMetrics(days, dateFrom, dateTo);
  }

  @Get('reports')
  async getReports(
    @Query('type') type: string = 'booking',
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Query('format') format: string,
    @Query('page') pageRaw?: string,
    @Query('page_size') pageSizeRaw?: string,
    @Res() res?: any,
  ) {
    const normalizedFormat = format ? format.toLowerCase() : 'json';
    if (!['json', 'csv'].includes(normalizedFormat)) {
      throw new BadRequestException(`Invalid report format '${format}'. Allowed values: json, csv`);
    }

    if (normalizedFormat === 'csv') {
      if (res) {
        return this.analyticsService.streamCsvReport(res, type, dateFrom, dateTo);
      }
      // Fallback if res is omitted (e.g. unit testing direct controller call)
      const legacyResult = await this.analyticsService.getReports(type, dateFrom, dateTo, format);
      return legacyResult;
    }

    let page = 1;
    if (pageRaw !== undefined && pageRaw !== '') {
      page = Number(pageRaw);
      if (isNaN(page) || !Number.isInteger(page) || page < 1) {
        throw new BadRequestException('page must be a positive integer greater than or equal to 1');
      }
    }

    let pageSize = 50;
    if (pageSizeRaw !== undefined && pageSizeRaw !== '') {
      pageSize = Number(pageSizeRaw);
      if (isNaN(pageSize) || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
        throw new BadRequestException('page_size must be a positive integer between 1 and 500');
      }
    }

    const result = await this.analyticsService.getPaginatedReports(
      type,
      dateFrom,
      dateTo,
      page,
      pageSize,
    );

    if (res) {
      if (typeof res.send === 'function') {
        return res.send(result);
      } else if (typeof res.json === 'function') {
        return res.json(result);
      }
    }

    return result;
  }
}
