import { Injectable, Inject } from '@nestjs/common';
import { ICatalogRepository, ServiceCategoryEntity, ServiceItemEntity } from '../ports/catalog-repository.interface';
import { IPlatformCatalogPublicFacade } from '../facade/platform-catalog-public-facade.interface';
import { CategoryNotFoundException, ServiceNotFoundException } from '../errors/catalog.errors';

@Injectable()
export class CatalogService implements IPlatformCatalogPublicFacade {
  constructor(
    @Inject('ICatalogRepository')
    private readonly catalogRepo: ICatalogRepository,
  ) {}

  async getActiveCategories(): Promise<ServiceCategoryEntity[]> {
    const categories = await this.catalogRepo.findAllCategories(false);

    // Filter out empty categories (categories containing zero active services)
    const activeCategories: ServiceCategoryEntity[] = [];
    for (const cat of categories) {
      const services = await this.catalogRepo.findServicesByCategory(cat.id, false);
      if (services.length > 0) {
        activeCategories.push(cat);
      }
    }

    return activeCategories;
  }

  async getServicesByCategory(categoryId: string): Promise<ServiceItemEntity[]> {
    const category = await this.catalogRepo.findCategoryById(categoryId);
    if (!category || !category.isActive) {
      throw new CategoryNotFoundException(categoryId);
    }

    return this.catalogRepo.findServicesByCategory(categoryId, false);
  }

  async getServiceById(serviceId: string): Promise<ServiceItemEntity> {
    const service = await this.catalogRepo.findServiceById(serviceId);
    if (!service || !service.isActive) {
      throw new ServiceNotFoundException(serviceId);
    }

    // Ensure parent category is active
    const category = await this.catalogRepo.findCategoryById(service.categoryId);
    if (!category || !category.isActive) {
      throw new ServiceNotFoundException(serviceId);
    }

    return service;
  }

  async validateFixedPrice(serviceId: string, clientPrice: string): Promise<boolean> {
    try {
      const service = await this.getServiceById(serviceId);
      const parsedClient = parseFloat(clientPrice);
      const parsedActual = parseFloat(service.fixedPrice);
      return Math.abs(parsedClient - parsedActual) < 0.001;
    } catch {
      return false;
    }
  }

  async getCurrentVersionHash(): Promise<string> {
    return this.catalogRepo.getCurrentVersion();
  }
}
