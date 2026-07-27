import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import {
  CategoryNotFoundException,
  ServiceNotFoundException,
} from '../errors/catalog.errors';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockCatalogRepo: any;

  beforeEach(async () => {
    mockCatalogRepo = {
      findAllCategories: jest.fn(),
      findServicesByCategory: jest.fn(),
      findCategoryById: jest.fn(),
      findServiceById: jest.fn(),
      getCurrentVersion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: 'ICatalogRepository',
          useValue: mockCatalogRepo,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveCategories (TC-UNIT-001-001)', () => {
    it('should filter out empty categories with zero active services', async () => {
      const categories = [
        { id: 'cat-1', name: 'Cleaning', isActive: true },
        { id: 'cat-2', name: 'Empty Cat', isActive: true },
      ];

      mockCatalogRepo.findAllCategories.mockResolvedValue(categories);
      mockCatalogRepo.findServicesByCategory.mockImplementation(
        (catId: string) => {
          if (catId === 'cat-1') {
            return Promise.resolve([
              {
                id: 'srv-1',
                name: 'Deep Clean',
                fixedPrice: '100.00',
                isActive: true,
              },
            ]);
          }
          return Promise.resolve([]);
        },
      );

      const result = await service.getActiveCategories();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
    });
  });

  describe('getServicesByCategory', () => {
    it('should return services for active category', async () => {
      mockCatalogRepo.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        isActive: true,
      });
      mockCatalogRepo.findServicesByCategory.mockResolvedValue([
        { id: 'srv-1', name: 'Deep Clean', fixedPrice: '100.00' },
      ]);

      const result = await service.getServicesByCategory('cat-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('srv-1');
    });

    it('should throw CategoryNotFoundException if category is inactive or missing', async () => {
      mockCatalogRepo.findCategoryById.mockResolvedValue(null);
      await expect(service.getServicesByCategory('missing')).rejects.toThrow(
        CategoryNotFoundException,
      );
    });
  });

  describe('getServiceById', () => {
    it('should return service details if service and parent category are active', async () => {
      mockCatalogRepo.findServiceById.mockResolvedValue({
        id: 'srv-1',
        categoryId: 'cat-1',
        isActive: true,
      });
      mockCatalogRepo.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        isActive: true,
      });

      const result = await service.getServiceById('srv-1');
      expect(result.id).toBe('srv-1');
    });

    it('should throw ServiceNotFoundException if service does not exist', async () => {
      mockCatalogRepo.findServiceById.mockResolvedValue(null);
      await expect(service.getServiceById('missing')).rejects.toThrow(
        ServiceNotFoundException,
      );
    });
  });
});
