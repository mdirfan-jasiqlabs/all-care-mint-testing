import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { CustomerProfileController } from './controllers/customer-profile.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { CustomerProfileService } from './services/customer-profile.service';
import { PrismaAuthRepository } from './adapters/prisma-auth.repository';
import { PlatformAuthPublicFacade } from './facade/platform-auth-public.facade';

@Module({
  controllers: [AuthController, CustomerProfileController],
  providers: [
    AuthService,
    TokenService,
    CustomerProfileService,
    PrismaAuthRepository,
    PlatformAuthPublicFacade,
  ],
  exports: [PlatformAuthPublicFacade, TokenService],
})
export class AuthModule {}
