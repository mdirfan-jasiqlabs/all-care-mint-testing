import { NotificationBadgeController } from './notification-badge.controller';

describe('NotificationBadgeController — Provider Leads Read-Only Verification', () => {
  let controller: NotificationBadgeController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      providerLead: {
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    controller = new NotificationBadgeController(mockPrisma);
  });

  it('should list provider leads without mutating lead status', async () => {
    const fakeLeads = [
      {
        id: 'lead-1',
        name: 'Test Applicant',
        mobileNumber: '9876543210',
        serviceArea: 'Bhopal',
        isAcknowledged: false,
        createdAt: new Date(),
      },
    ];

    mockPrisma.providerLead.findMany.mockResolvedValue(fakeLeads);
    mockPrisma.providerLead.count.mockResolvedValue(1);

    const result = await controller.listProviderLeads('1', '20', undefined, 'UNACKNOWLEDGED');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(fakeLeads);
    expect(mockPrisma.providerLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isAcknowledged: false },
      }),
    );

    // Verify updateMany was NEVER called during a read/list operation
    expect(mockPrisma.providerLead.updateMany).not.toHaveBeenCalled();
  });
});
