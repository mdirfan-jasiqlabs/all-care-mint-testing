import { Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
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

  @Get('provider-leads')
  async listProviderLeads(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'UNACKNOWLEDGED') {
      where.isAcknowledged = false;
    } else if (status === 'ACKNOWLEDGED') {
      where.isAcknowledged = true;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { mobileNumber: { contains: term, mode: 'insensitive' } },
        { serviceArea: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.providerLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.providerLead.count({ where }),
    ]);

    return {
      success: true,
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
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
