import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IProviderRepository, ProviderDetails } from '../ports/provider-repository.interface';
import { CreateProviderDto, ProviderStatusEnum } from '../dto/provider.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ProviderMobileExistsException,
  ProviderNotFoundException,
  CategoryNotFoundException,
} from '../errors/provider.exceptions';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProviderService {
  constructor(
    @Inject('IProviderRepository')
    private readonly providerRepo: IProviderRepository,
    private readonly prisma: PrismaService,
  ) {}

  private validateUuid(id: string) {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_INVALID_UUID',
          message: 'Invalid provider ID format. Must be a valid UUID.',
        },
      });
    }
  }

  async onboardProvider(dto: CreateProviderDto, adminId: string): Promise<ProviderDetails> {
    const rawMobile = dto.mobileNumber;
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
    const dbMobileNumber = '+91' + cleanMobile;

    const existing = await this.providerRepo.findProviderByMobile(dbMobileNumber);
    if (existing) {
      throw new ProviderMobileExistsException(dbMobileNumber);
    }

    // Validate category IDs if provided before creating provider record
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      const validCategories = await this.prisma.serviceCategory.findMany({
        where: { id: { in: dto.categoryIds } },
        select: { id: true },
      });
      if (validCategories.length !== dto.categoryIds.length) {
        throw new CategoryNotFoundException('One or more invalid category IDs provided.');
      }
    }

    const provider = await this.providerRepo.saveProvider({
      mobileNumber: dbMobileNumber,
      displayName: dto.fullName,
      serviceArea: dto.serviceArea,
      status: ProviderStatusEnum.PENDING_REVIEW,
    } as any);

    if (dto.categoryIds && dto.categoryIds.length > 0) {
      for (const catId of dto.categoryIds) {
        await this.providerRepo.addCategoryMapping(provider.id, catId);
      }
    }

    const finalProvider = await this.providerRepo.findProviderById(provider.id);

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'provider.onboarded',
        entityType: 'Provider',
        entityId: provider.id,
        newState: JSON.parse(JSON.stringify(finalProvider || provider)),
      },
    });

    return finalProvider || provider;
  }

  async updateProviderStatus(id: string, status: ProviderStatusEnum, adminId: string): Promise<ProviderDetails> {
    this.validateUuid(id);
    const existing = await this.providerRepo.findProviderById(id);
    if (!existing) {
      throw new ProviderNotFoundException(id);
    }

    const updated = await this.providerRepo.updateProviderStatus(id, status);

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'provider.status.updated',
        entityType: 'Provider',
        entityId: id,
        oldState: JSON.parse(JSON.stringify(existing)),
        newState: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }

  private async syncLeadsToProviders() {
    try {
      const leads = await this.prisma.providerLead.findMany();
      if (!leads || leads.length === 0) return;

      for (const lead of leads) {
        const cleanMobile = lead.mobileNumber.replace(/\D/g, '').slice(-10);
        if (!cleanMobile || cleanMobile.length !== 10) continue;
        const dbMobileNumber = '+91' + cleanMobile;

        const existing = await this.prisma.provider.findFirst({
          where: {
            OR: [
              { mobileNumber: dbMobileNumber },
              { mobileNumber: cleanMobile },
            ],
          },
        });

        if (!existing) {
          await this.prisma.provider.create({
            data: {
              displayName: lead.name,
              mobileNumber: dbMobileNumber,
              serviceArea: lead.serviceArea || 'General',
              status: ProviderStatusEnum.PENDING_REVIEW,
            },
          });
        }
      }
    } catch (err) {
      // Ignore sync errors gracefully
    }
  }

  async listProviders(query: {
    status?: ProviderStatusEnum;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProviderDetails[]; total: number }> {
    const page = query.page ? parseInt(query.page as any, 10) : 1;
    const limit = query.limit ? parseInt(query.limit as any, 10) : 20;
    return this.providerRepo.findProviders({
      status: query.status,
      search: query.search,
      page,
      limit,
    });
  }

  async getProviderById(id: string): Promise<ProviderDetails> {
    this.validateUuid(id);
    const provider = await this.providerRepo.findProviderById(id);
    if (!provider) {
      throw new ProviderNotFoundException(id);
    }
    return provider;
  }

  async assignCategory(providerId: string, categoryId: string): Promise<void> {
    this.validateUuid(providerId);
    const provider = await this.providerRepo.findProviderById(providerId);
    if (!provider) {
      throw new ProviderNotFoundException(providerId);
    }

    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      throw new CategoryNotFoundException(categoryId);
    }

    await this.providerRepo.addCategoryMapping(providerId, categoryId);
  }

  async removeCategory(providerId: string, categoryId: string): Promise<void> {
    this.validateUuid(providerId);
    const provider = await this.providerRepo.findProviderById(providerId);
    if (!provider) {
      throw new ProviderNotFoundException(providerId);
    }

    await this.providerRepo.removeCategoryMapping(providerId, categoryId);
  }

  // Facade support methods
  async getProviderStatus(providerId: string): Promise<ProviderStatusEnum | null> {
    const provider = await this.providerRepo.findProviderById(providerId);
    return provider ? provider.status : null;
  }

  async isProviderEligibleForCategory(providerId: string, categoryId: string): Promise<boolean> {
    const mappings = await this.providerRepo.findCategoryMappings(providerId);
    return mappings.includes(categoryId);
  }

  async validateProviderActive(providerId: string): Promise<void> {
    const provider = await this.providerRepo.findProviderById(providerId);
    if (!provider) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
          message: 'No provider account matches this mobile number.',
        },
      });
    }
    if (provider.status === 'SUSPENDED') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_PROVIDER_SUSPENDED',
          message: 'Account suspended.',
        },
      });
    }
    if (provider.status !== 'APPROVED') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
          message: `Provider status: ${provider.status}`,
        },
      });
    }
  }

  async getProviderSummary(): Promise<{ total: number; pending: number; approved: number; suspended: number; rejected: number }> {
    return this.providerRepo.getProviderSummary();
  }
}
