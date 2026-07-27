import { Test, TestingModule } from '@nestjs/testing';
import { CustomerProfileController } from './customer-profile.controller';
import { CustomerProfileService } from '../services/customer-profile.service';
import { TokenService } from '../services/token.service';

describe('CustomerProfileController', () => {
  let controller: CustomerProfileController;
  let profileService: jest.Mocked<CustomerProfileService>;

  const mockCustomer = {
    id: 'cust-123',
    mobileNumber: '+919876543210',
    displayName: 'Ravi Kumar',
    createdAt: new Date('2026-07-22T12:00:00Z'),
  };

  beforeEach(async () => {
    const mockProfileSvc = {
      getCustomerProfile: jest.fn().mockResolvedValue(mockCustomer),
      updateCustomerProfile: jest
        .fn()
        .mockResolvedValue({ ...mockCustomer, displayName: 'Updated Name' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerProfileController],
      providers: [
        { provide: CustomerProfileService, useValue: mockProfileSvc },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get<CustomerProfileController>(
      CustomerProfileController,
    );
    profileService = module.get(CustomerProfileService);
  });

  it('getProfile should return customer profile details', async () => {
    const req = { user: { id: 'cust-123' } };
    const response = await controller.getProfile(req);

    expect(response.success).toBe(true);
    expect(response.data.id).toBe('cust-123');
    expect(response.data.displayName).toBe('Ravi Kumar');
  });

  it('updateProfile should update customer name (TC-API-000-007)', async () => {
    const req = { user: { id: 'cust-123' } };
    const response = await controller.updateProfile(req, {
      name: 'Updated Name',
    });

    expect(response.success).toBe(true);
    expect(response.data.displayName).toBe('Updated Name');
    expect(profileService.updateCustomerProfile).toHaveBeenCalledWith(
      'cust-123',
      'Updated Name',
    );
  });
});
