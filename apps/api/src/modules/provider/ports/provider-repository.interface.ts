import { ProviderStatusEnum } from '../dto/provider.dto';

export interface ProviderDetails {
  id: string;
  mobileNumber: string;
  displayName: string;
  status: ProviderStatusEnum;
  serviceArea: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date | null;
  categories?: { id: string; name: string }[];
}

export interface IProviderRepository {
  findProviderById(id: string): Promise<ProviderDetails | null>;
  findProviderByMobile(mobile: string): Promise<ProviderDetails | null>;
  findProviders(filters: {
    status?: ProviderStatusEnum;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ data: ProviderDetails[]; total: number }>;
  saveProvider(provider: Partial<ProviderDetails> & { mobileNumber: string; displayName: string; serviceArea: string }): Promise<ProviderDetails>;
  updateProviderStatus(id: string, status: ProviderStatusEnum): Promise<ProviderDetails>;
  addCategoryMapping(providerId: string, categoryId: string): Promise<void>;
  removeCategoryMapping(providerId: string, categoryId: string): Promise<void>;
  findCategoryMappings(providerId: string): Promise<string[]>;
}
