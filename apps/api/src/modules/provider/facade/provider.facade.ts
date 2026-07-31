import { Injectable } from '@nestjs/common';
import { ProviderService } from '../services/provider.service';
import { ProviderStatusEnum } from '../dto/provider.dto';

export interface IPlatformProviderPublicFacade {
  getProviderStatus(providerId: string): Promise<ProviderStatusEnum | null>;
  isProviderEligibleForCategory(providerId: string, categoryId: string): Promise<boolean>;
  validateProviderActive(providerId: string): Promise<void>;
}

@Injectable()
export class PlatformProviderPublicFacade implements IPlatformProviderPublicFacade {
  constructor(private readonly providerService: ProviderService) {}

  async getProviderStatus(providerId: string): Promise<ProviderStatusEnum | null> {
    return this.providerService.getProviderStatus(providerId);
  }

  async isProviderEligibleForCategory(providerId: string, categoryId: string): Promise<boolean> {
    return this.providerService.isProviderEligibleForCategory(providerId, categoryId);
  }

  async validateProviderActive(providerId: string): Promise<void> {
    return this.providerService.validateProviderActive(providerId);
  }
}
