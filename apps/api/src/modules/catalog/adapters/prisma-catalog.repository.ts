import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ICatalogRepository,
  ServiceCategoryEntity,
  ServiceItemEntity,
} from '../ports/catalog-repository.interface';
import { createHash } from 'crypto';

@Injectable()
export class PrismaCatalogRepository implements ICatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCategoryById(id: string): Promise<ServiceCategoryEntity | null> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      iconUrl: category.iconUrl,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
    };
  }

  async findCategoryByName(
    name: string,
  ): Promise<ServiceCategoryEntity | null> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { name },
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      iconUrl: category.iconUrl,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
    };
  }

  async findAllCategories(
    includeInactive: boolean,
  ): Promise<ServiceCategoryEntity[]> {
    const whereCondition = includeInactive ? {} : { isActive: true };
    const categories = await this.prisma.serviceCategory.findMany({
      where: whereCondition,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      iconUrl: c.iconUrl,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }

  async saveCategory(
    category: Partial<ServiceCategoryEntity>,
  ): Promise<ServiceCategoryEntity> {
    const created = await this.prisma.serviceCategory.create({
      data: {
        name: category.name!,
        description: category.description || null,
        iconUrl: category.iconUrl || null,
        displayOrder: category.displayOrder ?? 0,
        isActive: category.isActive ?? true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      iconUrl: created.iconUrl,
      displayOrder: created.displayOrder,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async updateCategory(
    id: string,
    category: Partial<ServiceCategoryEntity>,
  ): Promise<ServiceCategoryEntity> {
    const updated = await this.prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(category.name !== undefined && { name: category.name }),
        ...(category.description !== undefined && {
          description: category.description,
        }),
        ...(category.iconUrl !== undefined && { iconUrl: category.iconUrl }),
        ...(category.displayOrder !== undefined && {
          displayOrder: category.displayOrder,
        }),
        ...(category.isActive !== undefined && { isActive: category.isActive }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      iconUrl: updated.iconUrl,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }

  async findServicesByCategory(
    categoryId: string,
    includeInactive: boolean,
  ): Promise<ServiceItemEntity[]> {
    const whereCondition: any = { categoryId };
    if (!includeInactive) {
      whereCondition.isActive = true;
      whereCondition.fixedPrice = { gt: 0 };
    }

    const services = await this.prisma.service.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' },
    });

    return services.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      fixedPrice: s.fixedPrice.toFixed(2),
      estimatedDuration: s.estimatedDuration,
      isActive: s.isActive,
      createdAt: s.createdAt,
    }));
  }

  async findServiceById(id: string): Promise<ServiceItemEntity | null> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) return null;

    return {
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      fixedPrice: service.fixedPrice.toFixed(2),
      estimatedDuration: service.estimatedDuration,
      isActive: service.isActive,
      createdAt: service.createdAt,
    };
  }

  async findServiceByNameInCategory(
    categoryId: string,
    name: string,
  ): Promise<ServiceItemEntity | null> {
    const service = await this.prisma.service.findUnique({
      where: {
        categoryId_name: { categoryId, name },
      },
    });

    if (!service) return null;

    return {
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      fixedPrice: service.fixedPrice.toFixed(2),
      estimatedDuration: service.estimatedDuration,
      isActive: service.isActive,
      createdAt: service.createdAt,
    };
  }

  async saveService(
    service: Partial<ServiceItemEntity>,
  ): Promise<ServiceItemEntity> {
    const created = await this.prisma.service.create({
      data: {
        categoryId: service.categoryId!,
        name: service.name!,
        description: service.description || null,
        fixedPrice: service.fixedPrice!,
        estimatedDuration: service.estimatedDuration || null,
        isActive: service.isActive ?? true,
      },
    });

    return {
      id: created.id,
      categoryId: created.categoryId,
      name: created.name,
      description: created.description,
      fixedPrice: created.fixedPrice.toFixed(2),
      estimatedDuration: created.estimatedDuration,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async updateService(
    id: string,
    service: Partial<ServiceItemEntity>,
  ): Promise<ServiceItemEntity> {
    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(service.name !== undefined && { name: service.name }),
        ...(service.description !== undefined && {
          description: service.description,
        }),
        ...(service.fixedPrice !== undefined && {
          fixedPrice: service.fixedPrice,
        }),
        ...(service.estimatedDuration !== undefined && {
          estimatedDuration: service.estimatedDuration,
        }),
        ...(service.isActive !== undefined && { isActive: service.isActive }),
      },
    });

    return {
      id: updated.id,
      categoryId: updated.categoryId,
      name: updated.name,
      description: updated.description,
      fixedPrice: updated.fixedPrice.toFixed(2),
      estimatedDuration: updated.estimatedDuration,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }

  async getCurrentVersion(): Promise<string> {
    const versionRecord = await this.prisma.catalogVersion.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (versionRecord) {
      return versionRecord.versionHash;
    }

    // Default initial version
    const initialHash = createHash('sha256')
      .update(`initial-${Date.now()}`)
      .digest('hex');
    await this.prisma.catalogVersion.create({
      data: { versionHash: initialHash },
    });

    return initialHash;
  }

  async incrementVersion(): Promise<string> {
    const newHash = createHash('sha256')
      .update(`v-${Date.now()}-${Math.random()}`)
      .digest('hex');
    await this.prisma.catalogVersion.create({
      data: { versionHash: newHash },
    });

    return newHash;
  }
}
