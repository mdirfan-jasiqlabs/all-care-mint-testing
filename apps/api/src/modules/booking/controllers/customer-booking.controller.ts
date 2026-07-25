// ─── MOD-002 Customer Booking Controller ───
// Source: DLD Section 6.2 — 7 routes

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto, LockSlotDto, CancelBookingDto } from '../dto/booking.dto';
import { ActorRoleEnum } from '../types/booking.types';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomerBookingController {
  constructor(private readonly bookingService: BookingService) {}

  /** 6.2.1 GET /api/v1/bookings/slots?service_id={id}&date={date} */
  @Get('slots')
  async getAvailableSlots(
    @Query('service_id') serviceId: string,
    @Query('date') date: string,
  ) {
    if (!serviceId || !date) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_MISSING_PARAMS',
          message: 'service_id and date query parameters are required.',
        },
      });
    }
    const data = await this.bookingService.getAvailableSlots(serviceId, date);
    return { success: true, data };
  }

  /** 6.2.2 POST /api/v1/bookings/slots/lock */
  @Post('slots/lock')
  async lockSlot(@Req() req: any, @Body() dto: LockSlotDto) {
    const data = await this.bookingService.lockSlot(req.user.id, dto);
    return { success: true, data };
  }

  /** 6.2.3 POST /api/v1/bookings */
  @Post()
  async createBooking(
    @Req() req: any,
    @Body() dto: CreateBookingDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_MISSING_IDEMPOTENCY_KEY',
          message: 'X-Idempotency-Key header is required.',
        },
      });
    }
    const data = await this.bookingService.createBooking(
      req.user.id,
      dto,
      idempotencyKey,
    );
    return {
      success: true,
      data: {
        bookingId: data.id,
        bookingReference: data.bookingReference,
        status: data.status,
        serviceName: data.serviceNameSnapshot,
        servicePrice: data.servicePriceSnapshot,
        slotDate: data.slotDate,
        slotLabel: data.slotLabelSnapshot,
        paymentMethod: data.paymentMethod,
      },
    };
  }

  /** 6.2.4 GET /api/v1/bookings */
  @Get()
  async listBookings(
    @Req() req: any,
    @Query('filter') filter: 'current' | 'history' = 'current',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.bookingService.getCustomerBookings(
      req.user.id,
      filter,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { success: true, data: result.data, total: result.total };
  }

  /** 6.2.5 GET /api/v1/bookings/:id */
  @Get(':id')
  async getBookingDetail(@Req() req: any, @Param('id') id: string) {
    const data = await this.bookingService.getBookingDetail(id, req.user.id);
    return { success: true, data };
  }

  /** 6.2.6 GET /api/v1/bookings/:id/history */
  @Get(':id/history')
  async getBookingHistory(@Req() req: any, @Param('id') id: string) {
    const data = await this.bookingService.getBookingHistory(id, req.user.id);
    return { success: true, data };
  }

  /** 6.2.7 PATCH /api/v1/bookings/:id/cancel */
  @Patch(':id/cancel')
  async cancelBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const data = await this.bookingService.cancelBooking(
      id,
      req.user.id,
      ActorRoleEnum.CUSTOMER,
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
