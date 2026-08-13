import { Controller, Get, Patch, Query, UseGuards, Inject, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('api/v1/admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NotificationBadgeController {
  private inFlightBadgePromise: Promise<any> | null = null;
  private inFlightLeadsPromises = new Map<string, Promise<any>>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject('REDIS_CLIENT')
    private readonly redisClient?: any,
  ) {}

  @Get('badge-counts')
  async getBadgeCounts() {
    const cacheKey = 'admin:notifications:badge-counts:v1';
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`[Redis Badge Cache Warning] get failed: ${err.message}`);
      }
    }

    if (this.inFlightBadgePromise) {
      return this.inFlightBadgePromise;
    }

    this.inFlightBadgePromise = (async () => {
      try {
        const unacknowledgedCount = await this.prisma.providerLead.count({
          where: {
            isAcknowledged: false,
          },
        });

        const result = {
          success: true,
          data: {
            provider_leads: unacknowledgedCount,
          },
        };

        if (this.redisClient) {
          try {
            await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 30);
          } catch (err: any) {
            console.warn(`[Redis Badge Cache Warning] set failed: ${err.message}`);
          }
        }
        return result;
      } finally {
        this.inFlightBadgePromise = null;
      }
    })();

    return this.inFlightBadgePromise;
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
    const statusVal = status || 'ALL';
    const searchVal = search ? search.trim() : 'ALL';

    const cacheKey = `admin:provider-leads:v1:${statusVal}:${searchVal}:${page}:${limit}`;

    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`[Redis Provider Leads Cache Warning] get failed: ${err.message}`);
      }
    }

    if (this.inFlightLeadsPromises.has(cacheKey)) {
      return this.inFlightLeadsPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
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

        const result = {
          success: true,
          data: leads,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };

        if (this.redisClient) {
          try {
            await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60);
          } catch (err: any) {
            console.warn(`[Redis Provider Leads Cache Warning] set failed: ${err.message}`);
          }
        }
        return result;
      } finally {
        this.inFlightLeadsPromises.delete(cacheKey);
      }
    })();

    this.inFlightLeadsPromises.set(cacheKey, promise);
    return promise;
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
