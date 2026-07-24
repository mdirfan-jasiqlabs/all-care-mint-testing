export interface ServiceCategoryEntity {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ServiceItemEntity {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  fixedPrice: string; // Serialized consistently as string
  estimatedDuration: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ICatalogRepository {
  findCategoryById(id: string): Promise<ServiceCategoryEntity | null>;
  findCategoryByName(name: string): Promise<ServiceCategoryEntity | null>;
  findAllCategories(includeInactive: boolean): Promise<ServiceCategoryEntity[]>;
  saveCategory(category: Partial<ServiceCategoryEntity>): Promise<ServiceCategoryEntity>;
  updateCategory(id: string, category: Partial<ServiceCategoryEntity>): Promise<ServiceCategoryEntity>;
  findServicesByCategory(categoryId: string, includeInactive: boolean): Promise<ServiceItemEntity[]>;
  findServiceById(id: string): Promise<ServiceItemEntity | null>;
  findServiceByNameInCategory(categoryId: string, name: string): Promise<ServiceItemEntity | null>;
  saveService(service: Partial<ServiceItemEntity>): Promise<ServiceItemEntity>;
  updateService(id: string, service: Partial<ServiceItemEntity>): Promise<ServiceItemEntity>;
  getCurrentVersion(): Promise<string>;
  incrementVersion(): Promise<string>;
}
