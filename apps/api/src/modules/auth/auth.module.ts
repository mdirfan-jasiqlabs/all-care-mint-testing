import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { CustomerProfileController } from './controllers/customer-profile.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { CustomerProfileService } from './services/customer-profile.service';
import { PrismaAuthRepository } from './adapters/prisma-auth.repository';
import { PlatformAuthPublicFacade } from './facade/platform-auth-public.facade';
import { ApprovedProviderGuard } from './guards/approved-provider.guard';

@Module({
  controllers: [AuthController, CustomerProfileController],
  providers: [
    AuthService,
    TokenService,
    CustomerProfileService,
    PrismaAuthRepository,
    PlatformAuthPublicFacade,
    ApprovedProviderGuard,
  ],
  exports: [PlatformAuthPublicFacade, TokenService, ApprovedProviderGuard],
})
export class AuthModule {}
