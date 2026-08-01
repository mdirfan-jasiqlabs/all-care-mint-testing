import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPushTokenRepository, PushTokenInfo } from '../ports/push-token-repository.interface';

@Injectable()
export class PrismaPushTokenRepository implements IPushTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTokensByUserId(userId: string): Promise<PushTokenInfo[]> {
    const records = await this.prisma.pushToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
    return records as PushTokenInfo[];
  }

  async upsertToken(
    userId: string,
    role: string,
    deviceId: string,
    fcmToken: string,
  ): Promise<PushTokenInfo> {
    const record = await this.prisma.pushToken.upsert({
      where: {
        userRole_deviceId: {
          userRole: role,
          deviceId,
        },
      },
      update: {
        userId,
        fcmToken,
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        userRole: role,
        deviceId,
        fcmToken,
        isActive: true,
      },
    });
    return record as PushTokenInfo;
  }

  async deactivateToken(fcmToken: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: { fcmToken },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async revokeByDeviceId(userId: string, deviceId: string): Promise<boolean> {
    const result = await this.prisma.pushToken.updateMany({
      where: {
        userId,
        deviceId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }
}
