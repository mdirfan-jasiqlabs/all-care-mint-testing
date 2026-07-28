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

  async createProvider(mobileNumber: string, displayName?: string): Promise<any> {
    return this.prisma.provider.create({
      data: {
        mobileNumber,
        displayName: displayName || `Provider-${mobileNumber.slice(-4)}`,
        serviceArea: 'Default Area',
        status: 'APPROVED',
      },
    });
  }

  async createOtpAttempt(
    mobileNumber: string,
    role: string,
    otpHash: string,
    expiresAt: Date,
  ): Promise<any> {
    return this.prisma.otpAttempt.create({
      data: {
        mobileNumber,
        role,
        otpHash,
        expiresAt,
      },
    });
  }

  async findLatestOtpAttempt(mobileNumber: string, role: string): Promise<any> {
    return this.prisma.otpAttempt.findFirst({
      where: {
        mobileNumber,
        role,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markOtpAttemptUsed(id: string): Promise<void> {
    await this.prisma.otpAttempt.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async incrementOtpFailedAttempts(id: string): Promise<number> {
    const res = await this.prisma.otpAttempt.update({
      where: { id },
      data: {
        failedAttempts: {
          increment: 1,
        },
      },
      select: {
        failedAttempts: true,
      },
    });
    return res.failedAttempts;
  }

  async countRecentOtpAttempts(
    mobileNumber: string,
    role: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.otpAttempt.count({
      where: {
        mobileNumber,
        role,
        createdAt: {
          gte: since,
        },
      },
    });
  }
}

