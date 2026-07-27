import { Injectable } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth.repository.port';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCustomerByMobile(mobileNumber: string): Promise<any> {
    return this.prisma.customer.findUnique({
      where: { mobileNumber },
    });
  }

  async findCustomerById(id: string): Promise<any> {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async updateCustomerDisplayName(userId: string, name: string): Promise<any> {
    return this.prisma.customer.update({
      where: { id: userId },
      data: {
        displayName: name,
      },
    });
  }

  async createCustomer(
    mobileNumber: string,
    firebaseUid: string,
  ): Promise<any> {
    return this.prisma.customer.create({
      data: {
        mobileNumber,
        firebaseUid,
      },
    });
  }

  async findProviderByMobile(mobileNumber: string): Promise<any> {
    return this.prisma.provider.findUnique({
      where: { mobileNumber },
    });
  }

  async findProviderById(id: string): Promise<any> {
    return this.prisma.provider.findUnique({
      where: { id },
    });
  }

  async findAdminByEmail(email: string): Promise<any> {
    return this.prisma.adminUser.findUnique({
      where: { email },
    });
  }

  async findAdminById(id: string): Promise<any> {
    return this.prisma.adminUser.findUnique({
      where: { id },
    });
  }

  async incrementAdminFailedAttempts(adminId: string): Promise<number> {
    const admin = await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        failedAttempts: {
          increment: 1,
        },
      },
      select: { failedAttempts: true },
    });
    return admin.failedAttempts;
  }

  async lockAdminAccount(adminId: string, lockedUntil: Date): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        lockedUntil,
      },
    });
  }

  async resetAdminFailedAttempts(adminId: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async saveRefreshToken(
    userId: string,
    role: string,
    tokenHash: string,
    expiresAt: Date,
    tokenFamilyId: string,
    parentId?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        userRole: role,
        tokenHash,
        tokenFamilyId,
        parentId,
        expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<any> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        parent: true,
      },
    });
  }

  async revokeToken(tokenId: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        isRevoked: true,
        revocationReason: reason,
      },
    });
  }

  async revokeTokenFamily(
    tokenFamilyId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenFamilyId },
      data: {
        isRevoked: true,
        revocationReason: reason,
      },
    });
  }

  async updateLastActivity(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        lastActivity: new Date(),
      },
    });
  }
}
