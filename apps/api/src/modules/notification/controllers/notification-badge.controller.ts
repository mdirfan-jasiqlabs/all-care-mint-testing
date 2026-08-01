import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('api/v1/admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NotificationBadgeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('badge-counts')
  async getBadgeCounts() {
    const unacknowledgedCount = await this.prisma.providerLead.count({
      where: {
        isAcknowledged: false,
      },
    });

    return {
      success: true,
      data: {
        provider_leads: unacknowledgedCount,
      },
    };
  }

  @Patch('provider-leads/read')
  async markLeadsRead() {
    await this.prisma.providerLead.updateMany({
      where: {
        isAcknowledged: false,
      },
      data: {
        isAcknowledged: true,
      },
    });

    return {
      success: true,
      message: 'Badge counts reset.',
    };
  }
}
