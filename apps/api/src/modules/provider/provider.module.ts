import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminProviderController } from './controllers/admin-provider.controller';
import { PublicProviderLeadController } from './controllers/public-provider-lead.controller';
import { ProviderService } from './services/provider.service';
import { ProviderLeadService } from './services/provider-lead.service';
import { PrismaProviderRepository } from './adapters/prisma-provider.repository';
import { PlatformProviderPublicFacade } from './facade/provider.facade';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminProviderController, PublicProviderLeadController],
  providers: [
    ProviderService,
    ProviderLeadService,
    {
      provide: 'IProviderRepository',
      useClass: PrismaProviderRepository,
    },
    PlatformProviderPublicFacade,
  ],
  exports: [ProviderService, ProviderLeadService, PlatformProviderPublicFacade],
})
export class ProviderModule {}
