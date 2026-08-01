import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IPushTokenRepository, PushTokenInfo } from '../ports/push-token-repository.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TokenRegistryService {
  constructor(
    @Inject(IPushTokenRepository)
    private readonly tokenRepo: IPushTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async registerToken(
    userId: string,
    role: string,
    deviceId: string,
    fcmToken: string,
  ): Promise<PushTokenInfo> {
    return this.tokenRepo.upsertToken(userId, role, deviceId, fcmToken);
  }

  async getActiveTokensForUser(userId: string): Promise<PushTokenInfo[]> {
    return this.tokenRepo.findTokensByUserId(userId);
  }

  async revokeToken(userId: string, deviceId: string): Promise<void> {
    // Check if token exists for any user
    const existing = await this.prisma.pushToken.findFirst({
      where: { deviceId },
    });

    if (!existing) {
      throw new NotFoundException(`Device token for device ${deviceId} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_FORBIDDEN',
          message: 'You do not have permission to revoke this device token.',
        },
      });
    }

    await this.tokenRepo.revokeByDeviceId(userId, deviceId);
  }

  async deactivateInvalidToken(fcmToken: string): Promise<void> {
    await this.tokenRepo.deactivateToken(fcmToken);
  }
}
