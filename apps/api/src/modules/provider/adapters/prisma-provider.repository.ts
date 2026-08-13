import { Injectable } from '@nestjs/common';
import { IProviderRepository, ProviderDetails } from '../ports/provider-repository.interface';
import { ProviderStatusEnum } from '../dto/provider.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaProviderRepository implements IProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDetails(p: any): ProviderDetails {
    return {
      id: p.id,
      mobileNumber: p.mobileNumber,
      displayName: p.displayName,
      status: p.status as ProviderStatusEnum,
      serviceArea: p.serviceArea,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastActiveAt: p.lastActiveAt,
      categories: p.categories ? p.categories.map((c: any) => ({ id: c.id, name: c.name })) : []
    };
  }

  async findProviderById(id: string): Promise<ProviderDetails | null> {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { categories: true }
    });
    if (!provider) return null;
    return this.mapToDetails(provider);
  }

  async findProviderByMobile(mobile: string): Promise<ProviderDetails | null> {
    const provider = await this.prisma.provider.findUnique({
      where: { mobileNumber: mobile },
      include: { categories: true }
    });
    if (!provider) return null;
    return this.mapToDetails(provider);
  }

  async findProviders(filters: {
    status?: ProviderStatusEnum;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ data: ProviderDetails[]; total: number }> {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { mobileNumber: { contains: filters.search } }
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [data, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mobileNumber: true,
          displayName: true,
          status: true,
          serviceArea: true,
          createdAt: true,
          updatedAt: true,
          lastActiveAt: true,
          categories: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.provider.count({ where })
    ]);

    return {
      data: data.map(p => this.mapToDetails(p)),
      total
    };
  }

  async saveProvider(provider: Partial<ProviderDetails> & { mobileNumber: string; displayName: string; serviceArea: string }): Promise<ProviderDetails> {
    const created = await this.prisma.provider.create({
      data: {
        mobileNumber: provider.mobileNumber,
        displayName: provider.displayName,
        serviceArea: provider.serviceArea,
        status: provider.status || 'PENDING_REVIEW',
      },
      include: { categories: true }
    });
    return this.mapToDetails(created);
  }

  async updateProviderStatus(id: string, status: ProviderStatusEnum): Promise<ProviderDetails> {
    const updated = await this.prisma.provider.update({
      where: { id },
      data: { status },
      include: { categories: true }
    });
    return this.mapToDetails(updated);
  }

  async addCategoryMapping(providerId: string, categoryId: string): Promise<void> {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        categories: {
          connect: { id: categoryId }
        }
      }
    });
  }

  async removeCategoryMapping(providerId: string, categoryId: string): Promise<void> {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        categories: {
          disconnect: { id: categoryId }
        }
      }
    });
  }

  async findCategoryMappings(providerId: string): Promise<string[]> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        categories: {
          select: { id: true }
        }
      }
    });
    return provider?.categories.map(c => c.id) || [];
  }

  async getProviderSummary(): Promise<{ total: number; pending: number; approved: number; suspended: number; rejected: number }> {
    const grouped = await this.prisma.provider.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const summary = { total: 0, pending: 0, approved: 0, suspended: 0, rejected: 0 };
    for (const item of grouped) {
      const count = item._count._all;
      summary.total += count;
      if (item.status === 'PENDING_REVIEW') summary.pending = count;
      if (item.status === 'APPROVED') summary.approved = count;
      if (item.status === 'SUSPENDED') summary.suspended = count;
      if (item.status === 'REJECTED') summary.rejected = count;
    }
    return summary;
  }
}
