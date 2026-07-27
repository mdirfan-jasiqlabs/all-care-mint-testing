// ─── MOD-002 Provider Booking Controller ───
// Source: DLD Section 6.4 — 6 routes

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BookingService } from '../services/booking.service';
import { RejectBookingDto, UpdateBookingStatusDto } from '../dto/booking.dto';
import { BookingStatusEnum } from '../types/booking.types';

@Controller('api/v1/providers/me/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderBookingController {
  constructor(private readonly bookingService: BookingService) {}

  /** 6.4.1 GET /api/v1/providers/me/bookings */
  @Get()
  async listActiveBookings(
    @Req() req: any,
    @Query('status') status?: BookingStatusEnum,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.bookingService.getProviderBookings(
      req.user.id,
      'active',
      parseInt(page, 10),
      parseInt(limit, 10),
      status,
    );
    return { success: true, data: result.data, total: result.total };
  }

  /** 6.4.3 GET /api/v1/provider/bookings/history — must be before :id */
  @Get('history')
  async listHistoryBookings(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.bookingService.getProviderBookings(
      req.user.id,
      'history',
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { success: true, data: result.data, total: result.total };
  }

  /** 6.4.2 GET /api/v1/provider/bookings/:id */
  @Get(':id')
  async getBookingDetail(@Req() req: any, @Param('id') id: string) {
    const data = await this.bookingService.getProviderBookingDetail(
      id,
      req.user.id,
    );
    return { success: true, data };
  }

  /** 6.4.4 PATCH /api/v1/provider/bookings/:id/accept */
  @Patch(':id/accept')
  async acceptBooking(@Req() req: any, @Param('id') id: string) {
    const data = await this.bookingService.providerAcceptBooking(
      id,
      req.user.id,
    );
    return { success: true, data };
  }

  /** 6.4.5 PATCH /api/v1/provider/bookings/:id/reject */
  @Patch(':id/reject')
  async rejectBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
  ) {
    const data = await this.bookingService.providerRejectBooking(
      id,
      req.user.id,
      dto.reason,
    );
    return { success: true, data };
  }

  /** 6.4.6 PATCH /api/v1/provider/bookings/:id/status */
  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const data = await this.bookingService.providerUpdateStatus(
      id,
      req.user.id,
      dto.status,
    );
    return { success: true, data };
  }
}
