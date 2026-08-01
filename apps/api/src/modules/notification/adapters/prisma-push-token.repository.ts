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
    platform: string = 'ANDROID',
  ): Promise<PushTokenInfo> {
    // Deterministic secure policy for duplicate fcmToken:
    // If another device/user already registered this exact fcmToken, revoke/reassign that previous record
    // to prevent uq_push_tokens_fcm_token constraint violation and ensure a single active owner.
    const existingTokenRow = await this.prisma.pushToken.findFirst({
      where: {
        fcmToken,
        NOT: {
          userId,
          deviceId,
        },
      },
    });

    if (existingTokenRow) {
      await this.prisma.pushToken.update({
        where: { id: existingTokenRow.id },
        data: {
          fcmToken: `reassigned_${existingTokenRow.id}_${Date.now()}`,
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }

    const record = await this.prisma.pushToken.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      update: {
        userRole: role,
        fcmToken,
        platform,
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        userRole: role,
        deviceId,
        fcmToken,
        platform,
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
