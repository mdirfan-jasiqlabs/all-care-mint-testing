import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminProviderController } from './controllers/admin-provider.controller';
import { PublicProviderLeadController } from './controllers/public-provider-lead.controller';
import { ProviderService } from './services/provider.service';
import { ProviderLeadService } from './services/provider-lead.service';
import { PrismaProviderRepository } from './adapters/prisma-provider.repository';
import { PlatformProviderPublicFacade } from './facade/provider.facade';
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
      console.warn(`[Redis Provider Client] Warning: ${err.message}`);
    });

    return client;
  },
};

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminProviderController, PublicProviderLeadController],
  providers: [
    ProviderService,
    ProviderLeadService,
    RedisClientProvider,
    {
      provide: 'IProviderRepository',
      useClass: PrismaProviderRepository,
    },
    PlatformProviderPublicFacade,
  ],
  exports: [ProviderService, ProviderLeadService, PlatformProviderPublicFacade],
})
export class ProviderModule {}
