import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './controllers/catalog.controller';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import { CatalogService } from './services/catalog.service';
import { AdminCatalogService } from './services/admin-catalog.service';
import { PrismaCatalogRepository } from './adapters/prisma-catalog.repository';
import { FeatureFlagService } from './services/feature-flag.service';
import Redis from 'ioredis';

const RedisClientProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    client.on('error', (err) => {
      console.warn(`[Redis Catalog Client] Warning: ${err.message}`);
    });

    return client;
  },
};

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    CatalogService,
    AdminCatalogService,
    FeatureFlagService,
    RedisClientProvider,
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
