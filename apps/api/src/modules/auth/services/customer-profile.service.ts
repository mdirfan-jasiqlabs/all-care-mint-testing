import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';

@Injectable()
export class CustomerProfileService {
  constructor(private readonly authRepository: PrismaAuthRepository) {}

  async getCustomerProfile(userId: string): Promise<any> {
    const customer = await this.authRepository.findCustomerById(userId);
    if (!customer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ERR_CUSTOMER_NOT_FOUND',
          message: 'Customer profile not found.',
        },
      });
    }
    return customer;
  }

  async updateCustomerProfile(userId: string, name: string): Promise<any> {
    // In our repository pattern we query Prisma to update the customer display name
    // Let's add updateCustomerDisplayName to the repository
    const customer = await this.authRepository.findCustomerById(userId);
    if (!customer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ERR_CUSTOMER_NOT_FOUND',
          message: 'Customer profile not found.',
        },
      });
    }

    // We can call a custom repository method or write inline using PrismaClient
    // Let's implement this update in PrismaAuthRepository
    return this.authRepository.updateCustomerDisplayName(userId, name);
  }
}
