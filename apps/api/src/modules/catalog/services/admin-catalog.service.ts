import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ICatalogRepository,
  ServiceCategoryEntity,
  ServiceItemEntity,
} from '../ports/catalog-repository.interface';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { CreateServiceDto, UpdateServiceDto } from '../dto/service.dto';
import {
  CategoryDuplicateException,
  CategoryNotFoundException,
  InvalidPriceException,
  ServiceNotFoundException,
} from '../errors/catalog.errors';

@Injectable()
export class AdminCatalogService {
  private inFlightCategoriesPromise: Promise<ServiceCategoryEntity[]> | null = null;

  constructor(
    @Inject('ICatalogRepository')
    private readonly catalogRepo: ICatalogRepository,
    private readonly prisma: PrismaService,
    @Optional()
    @Inject('REDIS_CLIENT')
    private readonly redisClient?: any,
  ) {}

  async getAllCategoriesAdmin(): Promise<ServiceCategoryEntity[]> {
    const cacheKey = 'admin:catalog:categories:v1';
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`[Redis Catalog Cache Warning] get failed: ${err.message}`);
      }
    }

    if (this.inFlightCategoriesPromise) {
      return this.inFlightCategoriesPromise;
    }

    this.inFlightCategoriesPromise = (async () => {
      try {
        const categories = await this.catalogRepo.findAllCategories(true);
        if (this.redisClient) {
          try {
            await this.redisClient.set(cacheKey, JSON.stringify(categories), 'EX', 300);
          } catch (err: any) {
            console.warn(`[Redis Catalog Cache Warning] set failed: ${err.message}`);
          }
        }
        return categories;
      } finally {
        this.inFlightCategoriesPromise = null;
      }
    })();

    return this.inFlightCategoriesPromise;
  }

  async getAllServicesForCategoryAdmin(
    categoryId: string,
  ): Promise<ServiceItemEntity[]> {
    const category = await this.catalogRepo.findCategoryById(categoryId);
    if (!category) {
      throw new CategoryNotFoundException(categoryId);
    }
    return this.catalogRepo.findServicesByCategory(categoryId, true);
  }

  async createCategory(
    dto: CreateCategoryDto,
    actorId: string,
    actorRole: string,
  ): Promise<ServiceCategoryEntity> {
    const existing = await this.catalogRepo.findCategoryByName(dto.name);
    if (existing) {
      throw new CategoryDuplicateException(dto.name);
    }

    const category = await this.catalogRepo.saveCategory({
      name: dto.name,
      description: dto.description,
      iconUrl: dto.iconUrl,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
    });

    await this.catalogRepo.incrementVersion();

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: 'catalog.category.create',
        entityType: 'ServiceCategory',
        entityId: category.id,
        newState: JSON.parse(JSON.stringify(category)),
      },
    });

    return category;
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    actorId: string,
    actorRole: string,
  ): Promise<ServiceCategoryEntity> {
    const existing = await this.catalogRepo.findCategoryById(id);
    if (!existing) {
      throw new CategoryNotFoundException(id);
    }

    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.catalogRepo.findCategoryByName(dto.name);
      if (duplicate) {
        throw new CategoryDuplicateException(dto.name);
      }
    }

    const updated = await this.catalogRepo.updateCategory(id, dto);

    await this.catalogRepo.incrementVersion();

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: 'catalog.category.update',
        entityType: 'ServiceCategory',
        entityId: id,
        oldState: JSON.parse(JSON.stringify(existing)),
        newState: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }

  async createService(
    dto: CreateServiceDto,
    actorId: string,
    actorRole: string,
  ): Promise<ServiceItemEntity> {
    const category = await this.catalogRepo.findCategoryById(dto.categoryId);
    if (!category) {
      throw new CategoryNotFoundException(dto.categoryId);
    }

    const priceNum = parseFloat(dto.fixedPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new InvalidPriceException('Fixed price must be greater than 0.');
    }

    const duplicate = await this.catalogRepo.findServiceByNameInCategory(
      dto.categoryId,
      dto.name,
    );
    if (duplicate) {
      throw new CategoryDuplicateException(
        `Service '${dto.name}' already exists in this category.`,
      );
    }

    const service = await this.catalogRepo.saveService({
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description,
      fixedPrice: parseFloat(dto.fixedPrice).toFixed(2),
      estimatedDuration: dto.estimatedDuration,
      isActive: true,
    });

    await this.catalogRepo.incrementVersion();

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: 'catalog.service.create',
        entityType: 'Service',
        entityId: service.id,
        newState: JSON.parse(JSON.stringify(service)),
      },
    });

    return service;
  }

  async updateService(
    id: string,
    dto: UpdateServiceDto,
    actorId: string,
    actorRole: string,
  ): Promise<ServiceItemEntity> {
    const existing = await this.catalogRepo.findServiceById(id);
    if (!existing) {
      throw new ServiceNotFoundException(id);
    }

    if (dto.fixedPrice !== undefined) {
      const priceNum = parseFloat(dto.fixedPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new InvalidPriceException('Fixed price must be greater than 0.');
      }
    }

    const updatePayload: Partial<ServiceItemEntity> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.fixedPrice !== undefined && {
        fixedPrice: parseFloat(dto.fixedPrice).toFixed(2),
      }),
      ...(dto.estimatedDuration !== undefined && {
        estimatedDuration: dto.estimatedDuration,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const updated = await this.catalogRepo.updateService(id, updatePayload);

    await this.catalogRepo.incrementVersion();

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: 'catalog.service.update',
        entityType: 'Service',
        entityId: id,
        oldState: JSON.parse(JSON.stringify(existing)),
        newState: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }

  async getCurrentVersionHash(): Promise<string> {
    return this.catalogRepo.getCurrentVersion();
  }
}
