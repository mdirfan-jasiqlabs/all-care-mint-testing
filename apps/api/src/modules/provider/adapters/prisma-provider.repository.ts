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
        include: { categories: true }
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
}
