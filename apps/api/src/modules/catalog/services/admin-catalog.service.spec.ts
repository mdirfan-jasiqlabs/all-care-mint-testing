import { Test, TestingModule } from '@nestjs/testing';
import { AdminCatalogService } from './admin-catalog.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CategoryDuplicateException,
  InvalidPriceException,
} from '../errors/catalog.errors';

describe('AdminCatalogService', () => {
  let service: AdminCatalogService;
  let mockCatalogRepo: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockCatalogRepo = {
      findAllCategories: jest.fn(),
      findCategoryById: jest.fn(),
      findCategoryByName: jest.fn(),
      saveCategory: jest.fn(),
      updateCategory: jest.fn(),
      findServicesByCategory: jest.fn(),
      findServiceById: jest.fn(),
      findServiceByNameInCategory: jest.fn(),
      saveService: jest.fn(),
      updateService: jest.fn(),
      incrementVersion: jest.fn(),
    };

    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCatalogService,
        {
          provide: 'ICatalogRepository',
          useValue: mockCatalogRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AdminCatalogService>(AdminCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    it('should create category and log audit record', async () => {
      mockCatalogRepo.findCategoryByName.mockResolvedValue(null);
      mockCatalogRepo.saveCategory.mockResolvedValue({
        id: 'cat-1',
        name: 'Plumbing',
        description: 'Pipes & leaks',
      });

      const result = await service.createCategory(
        { name: 'Plumbing', description: 'Pipes & leaks' },
        'admin-123',
        'ADMIN',
      );

      expect(result.id).toBe('cat-1');
      expect(mockCatalogRepo.incrementVersion).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'catalog.category.create',
          actorId: 'admin-123',
        }),
      });
    });

    it('should throw CategoryDuplicateException if category name already exists (TC-INT-001-003)', async () => {
      mockCatalogRepo.findCategoryByName.mockResolvedValue({
        id: 'cat-1',
        name: 'Plumbing',
      });

      await expect(
        service.createCategory({ name: 'Plumbing' }, 'admin-123', 'ADMIN'),
      ).rejects.toThrow(CategoryDuplicateException);
    });
  });

  describe('createService (TC-API-001-004)', () => {
    it('should throw InvalidPriceException if price is 0 or negative', async () => {
      mockCatalogRepo.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Plumbing',
      });

      await expect(
        service.createService(
          { categoryId: 'cat-1', name: 'Fix Leak', fixedPrice: '0' },
          'admin-123',
          'ADMIN',
        ),
      ).rejects.toThrow(InvalidPriceException);
    });
  });

  describe('updateService', () => {
    it('should update service details successfully', async () => {
      mockCatalogRepo.findServiceById.mockResolvedValue({
        id: 'svc-1',
        name: 'Old Name',
        fixedPrice: '100.00',
      });
      mockCatalogRepo.updateService.mockResolvedValue({
        id: 'svc-1',
        name: 'New Name',
        fixedPrice: '150.00',
      });

      const result = await service.updateService(
        'svc-1',
        { name: 'New Name', fixedPrice: '150' },
        'admin-123',
        'ADMIN',
      );

      expect(result.name).toBe('New Name');
      expect(mockCatalogRepo.updateService).toHaveBeenCalledWith('svc-1', {
        name: 'New Name',
        fixedPrice: '150.00',
      });
    });
  });
});
