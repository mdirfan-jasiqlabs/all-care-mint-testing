import {
  ServiceCategoryEntity,
  ServiceItemEntity,
} from '../ports/catalog-repository.interface';

export interface IPlatformCatalogPublicFacade {
  getActiveCategories(): Promise<ServiceCategoryEntity[]>;
  getServicesByCategory(categoryId: string): Promise<ServiceItemEntity[]>;
  getServiceById(serviceId: string): Promise<ServiceItemEntity>;
  validateFixedPrice(serviceId: string, clientPrice: string): Promise<boolean>;
}
