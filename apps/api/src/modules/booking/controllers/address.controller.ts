// ─── MOD-002 Address Controller ───
// Source: DLD Section 6.1 — 4 routes

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AddressService } from '../services/address.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/booking.dto';

@Controller('api/v1/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /** 6.1.1 GET /api/v1/addresses — List all saved addresses */
  @Get()
  async listAddresses(@Req() req: any) {
    const data = await this.addressService.listAddresses(req.user.id);
    return { success: true, data };
  }

  /** 6.1.2 POST /api/v1/addresses — Add a new customer address */
  @Post()
  async createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    const data = await this.addressService.createAddress(req.user.id, dto);
    return { success: true, data };
  }

  /** 6.1.3 PATCH /api/v1/addresses/:id — Edit an address */
  @Patch(':id')
  async updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const data = await this.addressService.updateAddress(req.user.id, id, dto);
    return { success: true, data };
  }

  /** 6.1.4 DELETE /api/v1/addresses/:id — Remove an address */
  @Delete(':id')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    await this.addressService.deleteAddress(req.user.id, id);
    return { success: true, message: 'Address deleted.' };
  }
}
