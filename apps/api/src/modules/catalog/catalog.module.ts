import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './controllers/catalog.controller';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import { CatalogService } from './services/catalog.service';
import { AdminCatalogService } from './services/admin-catalog.service';
import { PrismaCatalogRepository } from './adapters/prisma-catalog.repository';
import { FeatureFlagService } from './services/feature-flag.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    CatalogService,
    AdminCatalogService,
    FeatureFlagService,
    {
      provide: 'ICatalogRepository',
      useClass: PrismaCatalogRepository,
    },
    {
      provide: 'IPlatformCatalogPublicFacade',
      useExisting: CatalogService,
    },
  ],
  exports: [
    CatalogService,
    FeatureFlagService,
    'ICatalogRepository',
    'IPlatformCatalogPublicFacade',
  ],
})
export class CatalogModule {}
