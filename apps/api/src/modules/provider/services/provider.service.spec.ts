import { Test, TestingModule } from '@nestjs/testing';
import { ProviderService } from './provider.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderStatusEnum } from '../dto/provider.dto';
import { ProviderMobileExistsException, ProviderNotFoundException } from '../errors/provider.exceptions';
import { ForbiddenException } from '@nestjs/common';

describe('ProviderService', () => {
  let service: ProviderService;
  let mockProviderRepo: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockProviderRepo = {
      findProviderById: jest.fn(),
      findProviderByMobile: jest.fn(),
      findProviders: jest.fn(),
      saveProvider: jest.fn(),
      updateProviderStatus: jest.fn(),
      addCategoryMapping: jest.fn(),
      removeCategoryMapping: jest.fn(),
      findCategoryMappings: jest.fn(),
    };

    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      serviceCategory: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: 'IProviderRepository',
          useValue: mockProviderRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onboardProvider', () => {
    it('should format mobile number and onboard provider', async () => {
      mockProviderRepo.findProviderByMobile.mockResolvedValue(null);
      mockProviderRepo.saveProvider.mockResolvedValue({
        id: '4f1ea001-c812-42ea-a417-000000000001',
        mobileNumber: '+919876543210',
        displayName: 'Rajesh',
        status: ProviderStatusEnum.PENDING_REVIEW,
        serviceArea: 'Indiranagar',
      });
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: '4f1ea001-c812-42ea-a417-000000000001',
        mobileNumber: '+919876543210',
        displayName: 'Rajesh',
        status: ProviderStatusEnum.PENDING_REVIEW,
        serviceArea: 'Indiranagar',
      });

      const result = await service.onboardProvider(
        {
          fullName: 'Rajesh',
          mobileNumber: '9876543210',
          serviceArea: 'Indiranagar',
        },
        'admin-1',
      );

      expect(result.displayName).toBe('Rajesh');
      expect(result.mobileNumber).toBe('+919876543210');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if provider mobile already exists', async () => {
      mockProviderRepo.findProviderByMobile.mockResolvedValue({ id: '4f1ea001-c812-42ea-a417-000000000001' });

      await expect(
        service.onboardProvider(
          {
            fullName: 'Rajesh',
            mobileNumber: '9876543210',
            serviceArea: 'Indiranagar',
          },
          'admin-1',
        ),
      ).rejects.toThrow(ProviderMobileExistsException);
    });
  });

  describe('updateProviderStatus', () => {
    it('should update status and create audit log', async () => {
      const existing = {
        id: '4f1ea001-c812-42ea-a417-000000000001',
        mobileNumber: '+919876543210',
        displayName: 'Rajesh',
        status: ProviderStatusEnum.PENDING_REVIEW,
      };
      mockProviderRepo.findProviderById.mockResolvedValue(existing);
      mockProviderRepo.updateProviderStatus.mockResolvedValue({
        ...existing,
        status: ProviderStatusEnum.APPROVED,
      });

      const result = await service.updateProviderStatus('4f1ea001-c812-42ea-a417-000000000001', ProviderStatusEnum.APPROVED, 'admin-1');
      expect(result.status).toBe(ProviderStatusEnum.APPROVED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on invalid UUID', async () => {
      await expect(
        service.updateProviderStatus('invalid-uuid-123', ProviderStatusEnum.APPROVED, 'admin-1'),
      ).rejects.toThrow();
    });
  });

  describe('validateProviderActive', () => {
    it('should throw ForbiddenException if provider is suspended', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: '4f1ea001-c812-42ea-a417-000000000001',
        status: ProviderStatusEnum.SUSPENDED,
      });

      await expect(service.validateProviderActive('4f1ea001-c812-42ea-a417-000000000001')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if provider is pending', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: '4f1ea001-c812-42ea-a417-000000000001',
        status: ProviderStatusEnum.PENDING_REVIEW,
      });

      await expect(service.validateProviderActive('4f1ea001-c812-42ea-a417-000000000001')).rejects.toThrow(ForbiddenException);
    });

    it('should pass if provider is approved', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: '4f1ea001-c812-42ea-a417-000000000001',
        status: ProviderStatusEnum.APPROVED,
      });

      await expect(service.validateProviderActive('4f1ea001-c812-42ea-a417-000000000001')).resolves.not.toThrow();
    });
  });
});
