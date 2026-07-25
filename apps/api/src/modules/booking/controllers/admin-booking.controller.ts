// ─── MOD-002 Admin Booking Controller ───
// Source: DLD Section 6.3 — 5 routes

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
import {
  BookingListQueryDto,
  ReassignProviderDto,
  CancelBookingDto,
} from '../dto/booking.dto';
import { ActorRoleEnum } from '../types/booking.types';

@Controller('api/v1/admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBookingController {
  constructor(private readonly bookingService: BookingService) {}

  /** 6.3.1 GET /api/v1/admin/bookings */
  @Get()
  async listBookings(@Query() query: BookingListQueryDto) {
    const result = await this.bookingService.getAdminBookings(query);
    return { success: true, data: result.data, total: result.total };
  }

  @Get('providers')
  async listApprovedProviders() {
    const data = await this.bookingService.getApprovedProviders();
    return { success: true, data };
  }

  /** 6.3.2 GET /api/v1/admin/bookings/:id */
  @Get(':id')
  async getBookingDetail(@Param('id') id: string) {
    const data = await this.bookingService.getAdminBookingDetail(id);
    return { success: true, data };
  }

  @Get(':id/history')
  async getBookingHistory(@Param('id') id: string) {
    const data = await this.bookingService.getAdminBookingHistory(id);
    return { success: true, data };
  }

  /** 6.3.3 PATCH /api/v1/admin/bookings/:id/assign */
  @Patch(':id/assign')
  async assignProvider(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReassignProviderDto,
  ) {
    const data = await this.bookingService.assignProvider(
      id,
      dto.providerId,
      req.user.id,
    );
    return { success: true, data };
  }

  /** 6.3.4 PATCH /api/v1/admin/bookings/:id/reassign */
  @Patch(':id/reassign')
  async reassignProvider(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReassignProviderDto,
  ) {
    const data = await this.bookingService.reassignProvider(
      id,
      dto.providerId,
      req.user.id,
    );
    return { success: true, data };
  }

  /** 6.3.5 PATCH /api/v1/admin/bookings/:id/cancel */
  @Patch(':id/cancel')
  async cancelBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const data = await this.bookingService.cancelBooking(
      id,
      req.user.id,
      ActorRoleEnum.ADMIN,
      dto.reason,
    );
    return {
      success: true,
      data: {
        id: data.id,
        status: data.status,
        cancelledAt: data.cancelledAt,
      },
    };
  }
}
