import { Controller, Get, Patch, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import * as crypto from 'crypto';
import { CustomerProfileService } from '../services/customer-profile.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UpdateCustomerProfileDto } from '../dto/update-customer-profile.dto';

@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerProfileController {
  constructor(private readonly profileService: CustomerProfileService) {}

  @Get('me')
  @Roles('CUSTOMER')
  async getProfile(@Req() req: any) {
    const customer = await this.profileService.getCustomerProfile(req.user.id);
    return {
      success: true,
      data: {
        id: customer.id,
        mobileNumber: customer.mobileNumber,
        displayName: customer.displayName,
        createdAt: customer.createdAt.toISOString(),
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch('me')
  @Roles('CUSTOMER')
  @HttpCode(200)
  async updateProfile(@Req() req: any, @Body() dto: UpdateCustomerProfileDto) {
    const customer = await this.profileService.updateCustomerProfile(req.user.id, dto.name);
    return {
      success: true,
      data: {
        id: customer.id,
        mobileNumber: customer.mobileNumber,
        displayName: customer.displayName,
        createdAt: customer.createdAt.toISOString(),
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
