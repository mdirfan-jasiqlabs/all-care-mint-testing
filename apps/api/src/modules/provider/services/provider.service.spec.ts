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
        id: 'prov-1',
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
      mockProviderRepo.findProviderByMobile.mockResolvedValue({ id: 'prov-1' });

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
        id: 'prov-1',
        mobileNumber: '+919876543210',
        displayName: 'Rajesh',
        status: ProviderStatusEnum.PENDING_REVIEW,
      };
      mockProviderRepo.findProviderById.mockResolvedValue(existing);
      mockProviderRepo.updateProviderStatus.mockResolvedValue({
        ...existing,
        status: ProviderStatusEnum.APPROVED,
      });

      const result = await service.updateProviderStatus('prov-1', ProviderStatusEnum.APPROVED, 'admin-1');
      expect(result.status).toBe(ProviderStatusEnum.APPROVED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('validateProviderActive', () => {
    it('should throw ForbiddenException if provider is suspended', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: 'prov-1',
        status: ProviderStatusEnum.SUSPENDED,
      });

      await expect(service.validateProviderActive('prov-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if provider is pending', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: 'prov-1',
        status: ProviderStatusEnum.PENDING_REVIEW,
      });

      await expect(service.validateProviderActive('prov-1')).rejects.toThrow(ForbiddenException);
    });

    it('should pass if provider is approved', async () => {
      mockProviderRepo.findProviderById.mockResolvedValue({
        id: 'prov-1',
        status: ProviderStatusEnum.APPROVED,
      });

      await expect(service.validateProviderActive('prov-1')).resolves.not.toThrow();
    });
  });
});
