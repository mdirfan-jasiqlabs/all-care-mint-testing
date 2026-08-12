import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProviderService } from '../services/provider.service';
import {
  CreateProviderDto,
  UpdateProviderStatusDto,
  AssignCategoryDto,
  ProviderStatusEnum,
} from '../dto/provider.dto';

@Controller('api/v1/admin/providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get('summary')
  async getSummary() {
    const summary = await this.providerService.getProviderSummary();
    return { success: true, data: summary };
  }

  @Post()
  async onboardProvider(@Req() req: any, @Body() dto: CreateProviderDto) {
    const provider = await this.providerService.onboardProvider(dto, req.user.id);
    return { success: true, data: provider };
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProviderStatusDto,
  ) {
    const provider = await this.providerService.updateProviderStatus(
      id,
      dto.status,
      req.user.id,
    );
    return { success: true, data: provider };
  }

  @Get()
  async listProviders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: ProviderStatusEnum,
    @Query('search') search?: string,
  ) {
    const result = await this.providerService.listProviders({
      status,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    return { success: true, data: result.data, total: result.total };
  }

  @Get(':id')
  async getProvider(@Param('id') id: string) {
    const provider = await this.providerService.getProviderById(id);
    return { success: true, data: provider };
  }

  @Post(':id/categories')
  async assignCategory(
    @Param('id') id: string,
    @Body() dto: AssignCategoryDto,
  ) {
    await this.providerService.assignCategory(id, dto.categoryId);
    return { success: true, message: 'Category assigned successfully' };
  }

  @Delete(':id/categories/:categoryId')
  async removeCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ) {
    await this.providerService.removeCategory(id, categoryId);
    return { success: true, message: 'Category removed successfully' };
  }
}
