import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminProviderController } from './controllers/admin-provider.controller';
import { ProviderService } from './services/provider.service';
import { PrismaProviderRepository } from './adapters/prisma-provider.repository';
import { PlatformProviderPublicFacade } from './facade/provider.facade';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminProviderController],
  providers: [
    ProviderService,
    {
      provide: 'IProviderRepository',
      useClass: PrismaProviderRepository,
    },
    PlatformProviderPublicFacade,
  ],
  exports: [ProviderService, PlatformProviderPublicFacade],
})
export class ProviderModule {}
