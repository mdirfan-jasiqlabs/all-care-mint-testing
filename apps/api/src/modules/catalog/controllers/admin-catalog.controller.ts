import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AdminCatalogService } from '../services/admin-catalog.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { CreateServiceDto, UpdateServiceDto } from '../dto/service.dto';
import { randomUUID } from 'crypto';

@Controller('api/v1/admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCatalogController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Get('categories')
  async getAllCategories() {
    const categories = await this.adminCatalogService.getAllCategoriesAdmin();

    return {
      success: true,
      data: categories,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('categories')
  @HttpCode(201)
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id || 'admin-system';
    const actorRole = req.user?.role || 'ADMIN';
    const category = await this.adminCatalogService.createCategory(
      dto,
      actorId,
      actorRole,
    );

    return {
      success: true,
      data: category,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id || 'admin-system';
    const actorRole = req.user?.role || 'ADMIN';
    const category = await this.adminCatalogService.updateCategory(
      id,
      dto,
      actorId,
      actorRole,
    );

    return {
      success: true,
      data: category,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('categories/:id/services')
  async getCategoryServices(
    @Param('id') id: string,
  ) {
    const services = await this.adminCatalogService.getAllServicesForCategoryAdmin(id);

    return {
      success: true,
      data: services,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('services')
  @HttpCode(201)
  async createService(
    @Body() dto: CreateServiceDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id || 'admin-system';
    const actorRole = req.user?.role || 'ADMIN';
    const service = await this.adminCatalogService.createService(
      dto,
      actorId,
      actorRole,
    );

    return {
      success: true,
      data: service,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch('services/:id')
  async updateService(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id || 'admin-system';
    const actorRole = req.user?.role || 'ADMIN';
    const service = await this.adminCatalogService.updateService(
      id,
      dto,
      actorId,
      actorRole,
    );

    return {
      success: true,
      data: service,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
