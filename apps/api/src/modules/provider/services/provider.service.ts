import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { IProviderRepository, ProviderDetails } from '../ports/provider-repository.interface';
import { CreateProviderDto, ProviderStatusEnum } from '../dto/provider.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ProviderMobileExistsException,
  ProviderNotFoundException,
  CategoryNotFoundException,
} from '../errors/provider.exceptions';

@Injectable()
export class ProviderService {
  constructor(
    @Inject('IProviderRepository')
    private readonly providerRepo: IProviderRepository,
    private readonly prisma: PrismaService,
  ) {}

  async onboardProvider(dto: CreateProviderDto, adminId: string): Promise<ProviderDetails> {
    const rawMobile = dto.mobileNumber;
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
    const dbMobileNumber = '+91' + cleanMobile;

    const existing = await this.providerRepo.findProviderByMobile(dbMobileNumber);
    if (existing) {
      throw new ProviderMobileExistsException(dbMobileNumber);
    }

    const provider = await this.providerRepo.saveProvider({
      mobileNumber: dbMobileNumber,
      displayName: dto.fullName,
      serviceArea: dto.serviceArea,
      status: ProviderStatusEnum.PENDING_REVIEW,
    } as any);

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'provider.onboarded',
        entityType: 'Provider',
        entityId: provider.id,
        newState: JSON.parse(JSON.stringify(provider)),
      },
    });

    return provider;
  }

  async updateProviderStatus(id: string, status: ProviderStatusEnum, adminId: string): Promise<ProviderDetails> {
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
    const provider = await this.providerRepo.findProviderById(id);
    if (!provider) {
      throw new ProviderNotFoundException(id);
    }
    return provider;
  }

  async assignCategory(providerId: string, categoryId: string): Promise<void> {
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
}
