import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TokenRegistryService } from '../services/token-registry.service';
import { RegisterPushTokenDto } from '../dto/register-push-token.dto';

@Controller('api/v1/notifications/device-tokens')
@UseGuards(JwtAuthGuard)
export class PushTokenController {
  constructor(private readonly tokenRegistryService: TokenRegistryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async registerToken(@Req() req: any, @Body() body: RegisterPushTokenDto) {
    const fcmToken = body.getResolvedToken();
    const deviceId = body.getResolvedDeviceId();
    const userRole = body.getResolvedUserRole(req.user?.role || 'CUSTOMER');

    if (!fcmToken || !deviceId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_VALIDATION_FAILED',
          message: 'fcmToken (or fcm_token) and deviceId (or device_id) are required fields.',
        },
      });
    }

    const userId = req.user?.id;
    const tokenInfo = await this.tokenRegistryService.registerToken(
      userId,
      userRole,
      deviceId,
      fcmToken,
    );

    return {
      success: true,
      data: {
        tokenId: tokenInfo.id,
        fcmToken: tokenInfo.fcmToken,
        deviceId: tokenInfo.deviceId,
        isActive: tokenInfo.isActive,
      },
    };
  }

  @Delete(':device_id')
  async revokeToken(@Req() req: any, @Param('device_id') deviceId: string) {
    const userId = req.user?.id;
    await this.tokenRegistryService.revokeToken(userId, deviceId);
    return {
      success: true,
      message: 'Push token successfully revoked.',
    };
  }
}
