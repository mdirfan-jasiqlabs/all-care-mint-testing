import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { TokenRegistryService } from '../services/token-registry.service';
import { PushTokenInfo } from '../ports/push-token-repository.interface';

export interface INotificationPublicFacade {
  sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void>;
  registerDeviceToken(
    userId: string,
    role: string,
    deviceId: string,
    token: string,
  ): Promise<PushTokenInfo>;
}

@Injectable()
export class NotificationPublicFacade implements INotificationPublicFacade {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly tokenRegistry: TokenRegistryService,
  ) {}

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    return this.notificationService.sendPushToUser(userId, title, body, data);
  }

  async registerDeviceToken(
    userId: string,
    role: string,
    deviceId: string,
    token: string,
  ): Promise<PushTokenInfo> {
    return this.tokenRegistry.registerToken(userId, role, deviceId, token);
  }
}
