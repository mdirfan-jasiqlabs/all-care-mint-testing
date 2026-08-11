import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubmitProviderLeadDto } from '../dto/provider.dto';

@Injectable()
export class ProviderLeadService {
  private readonly logger = new Logger(ProviderLeadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitLead(dto: SubmitProviderLeadDto) {
    const rawMobile = dto.mobileNumber || dto.mobile || '';
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
    const serviceArea = (dto.serviceArea || dto.service_area || 'General').trim();

    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9][0-9]{9}$/.test(cleanMobile)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_INVALID_MOBILE',
          message: 'Mobile number is required and must be a valid 10-digit Indian mobile number.',
        },
      });
    }

    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_MISSING_NAME',
          message: 'Full name is required.',
        },
      });
    }

    const maskedMobile = `${cleanMobile.slice(0, 3)}***${cleanMobile.slice(-4)}`;
    this.logger.log(`Received public provider lead submission for area: ${serviceArea}, mobile: ${maskedMobile}`);

    // Race-condition-safe duplicate submission check inside transaction
    const lead = await this.prisma.$transaction(async (tx) => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const existingRecent = await tx.providerLead.findFirst({
        where: {
          mobileNumber: cleanMobile,
          createdAt: { gte: fiveMinutesAgo },
        },
      });

      if (existingRecent) {
        this.logger.log(`Duplicate lead submission throttled for mobile: ${maskedMobile}`);
        return existingRecent;
      }

      const createdLead = await tx.providerLead.create({
        data: {
          name: dto.name.trim(),
          mobileNumber: cleanMobile,
          serviceArea,
          isAcknowledged: false,
        },
      });

      const dbMobileNumber = '+91' + cleanMobile;
      const existingProvider = await tx.provider.findFirst({
        where: {
          OR: [
            { mobileNumber: dbMobileNumber },
            { mobileNumber: cleanMobile },
          ],
        },
      });

      if (!existingProvider) {
        await tx.provider.create({
          data: {
            displayName: dto.name.trim(),
            mobileNumber: dbMobileNumber,
            serviceArea,
            status: 'PENDING_REVIEW',
          },
        });
      }

      return createdLead;
    });

    return {
      id: lead.id,
      name: lead.name,
      mobileNumber: lead.mobileNumber,
      serviceArea: lead.serviceArea,
      createdAt: lead.createdAt,
    };
  }

  async listLeads(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Math.max(1, query.page ? parseInt(query.page as any, 10) : 1);
    const limit = Math.min(100, Math.max(1, query.limit ? parseInt(query.limit as any, 10) : 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status === 'UNACKNOWLEDGED') {
      where.isAcknowledged = false;
    } else if (query.status === 'ACKNOWLEDGED') {
      where.isAcknowledged = true;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { mobileNumber: { contains: term, mode: 'insensitive' } },
        { serviceArea: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.providerLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.providerLead.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
