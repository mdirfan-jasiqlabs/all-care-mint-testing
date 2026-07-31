// ─── MOD-002 Eligibility Service ───
// Source: DLD Section 4.1 — verifies provider category mapping and status checks

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderIneligibleException } from '../errors/booking.exceptions';

@Injectable()
export class EligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify provider is eligible for assignment:
   * 1. Provider exists and has status APPROVED
   * 2. (Future) Provider serves the category of the booked service
   */
  async verifyProviderEligibility(
    providerId: string,
    serviceId: string,
  ): Promise<void> {
    // Check provider exists and is APPROVED
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new ProviderIneligibleException('Provider not found.');
    }

    if (provider.status === 'SUSPENDED') {
      throw new ProviderIneligibleException(
        'Selected provider is suspended and ineligible for assignments.',
      );
    }

    if (provider.status !== 'APPROVED') {
      throw new ProviderIneligibleException(
        `Provider status is ${provider.status}. Only APPROVED providers can be assigned.`,
      );
    }

    // Fetch the service to get its category
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { category: true },
    });

    if (!service) {
      throw new ProviderIneligibleException('Service not found.');
    }

    // Check category mapping
    const isMapped = await this.prisma.provider.findFirst({
      where: {
        id: providerId,
        categories: {
          some: {
            id: service.categoryId,
          },
        },
      },
    });

    if (!isMapped) {
      throw new ProviderIneligibleException(
        'Provider is not mapped to the booking service category.',
      );
    }
  }
}
