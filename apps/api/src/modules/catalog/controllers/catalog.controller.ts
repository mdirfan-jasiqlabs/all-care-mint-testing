import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  ParseUUIDPipe,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeatureFlagService } from '../services/feature-flag.service';
import { randomUUID, createHash } from 'crypto';

@Controller()
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  private checkFeatureFlag() {
    if (!this.featureFlagService.isCatalogEnabled()) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'ERR_SERVICE_UNAVAILABLE',
          message: 'Service catalog is currently unavailable.',
        },
      });
    }
  }

  @Get('api/v1/catalog/categories')
  async getCategories(@Req() req: any, @Res({ passthrough: true }) res: any) {
    this.checkFeatureFlag();
    const startTime = Date.now();
    const userId = req.user?.id || 'unknown';

    const versionHash = await this.catalogService.getCurrentVersionHash();
    const ifNoneMatch = req.headers ? req.headers['if-none-match'] : null;

    if (ifNoneMatch && ifNoneMatch === `"${versionHash}"`) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    const categories = await this.catalogService.getActiveCategories();

    if (res.header) {
      res.header('ETag', `"${versionHash}"`);
      res.header('Cache-Control', 'private, max-age=300');
    } else if (res.setHeader) {
      res.setHeader('ETag', `"${versionHash}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `catalog.categories.list.requested user_id=${userId} response_time_ms=${duration} count=${categories.length}`,
    );

    if (duration > 1000) {
      this.logger.warn(`catalog_latency_high duration_ms=${duration}`);
    }

    return {
      success: true,
      data: categories,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/v1/catalog/categories/:id/services')
  async getServicesByCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    this.checkFeatureFlag();
    const startTime = Date.now();
    const userId = req.user?.id || 'unknown';

    const services = await this.catalogService.getServicesByCategory(id);

    // Compute deterministic ETag based on services content
    const etagSource = services.map(s => `${s.id}-${s.fixedPrice}-${s.isActive}`).join('|');
    const servicesEtag = `"${createHash('sha256').update(etagSource).digest('hex')}"`;

    const ifNoneMatch = req.headers ? req.headers['if-none-match'] : null;
    if (ifNoneMatch && ifNoneMatch === servicesEtag) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    if (res.header) {
      res.header('ETag', servicesEtag);
      res.header('Cache-Control', 'private, max-age=300');
    } else if (res.setHeader) {
      res.setHeader('ETag', servicesEtag);
      res.setHeader('Cache-Control', 'private, max-age=300');
    }

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      this.logger.warn(`catalog_latency_high duration_ms=${duration}`);
    }

    return {
      success: true,
      data: services,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/v1/catalog/services/:id')
  async getServiceById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    this.checkFeatureFlag();
    const startTime = Date.now();
    const userId = req.user?.id || 'unknown';

    const service = await this.catalogService.getServiceById(id);

    this.logger.log(
      `catalog.service.viewed user_id=${userId} service_id=${service.id} category_id=${service.categoryId}`,
    );

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      this.logger.warn(`catalog_latency_high duration_ms=${duration}`);
    }

    return {
      success: true,
      data: service,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(['api/v1/public/categories', 'api/v1/public/catalog/categories'])
  async getPublicCategories(@Res({ passthrough: true }) res: any) {
    this.checkFeatureFlag();
    const categories = await this.catalogService.getActiveCategories();

    if (res.header) {
      res.header('Cache-Control', 'public, max-age=900');
    } else if (res.setHeader) {
      res.setHeader('Cache-Control', 'public, max-age=900');
    }

    return {
      success: true,
      data: categories,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
