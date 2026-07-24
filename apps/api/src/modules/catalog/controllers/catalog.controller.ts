import { Controller, Get, Param, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { randomUUID } from 'crypto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @UseGuards(JwtAuthGuard)
  @Get('api/v1/catalog/categories')
  async getCategories(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
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
    @Param('id') id: string,
  ) {
    const services = await this.catalogService.getServicesByCategory(id);

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
    @Param('id') id: string,
  ) {
    const service = await this.catalogService.getServiceById(id);

    return {
      success: true,
      data: service,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('api/v1/public/categories')
  async getPublicCategories(
    @Res({ passthrough: true }) res: any,
  ) {
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
