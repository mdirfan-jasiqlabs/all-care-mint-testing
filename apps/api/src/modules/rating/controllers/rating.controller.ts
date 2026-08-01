import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RatingService } from '../services/rating.service';
import { AdminRatingsQueryDto, CreateRatingDto } from '../dto/rating.dto';

@Controller('api/v1/admin/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRatingController {
  constructor(private readonly ratingService: RatingService) {}

  /** GET /api/v1/admin/ratings - Paginated ratings list for admin */
  @Get()
  async getAdminRatings(@Query() query: AdminRatingsQueryDto) {
    const result = await this.ratingService.getAdminRatings(query);
    return {
      success: true,
      data: result,
    };
  }
}

@Controller('api/v1/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomerRatingController {
  constructor(private readonly ratingService: RatingService) {}

  /** POST /api/v1/ratings - Submit rating for completed booking */
  @Post()
  async createRating(@Req() req: any, @Body() dto: CreateRatingDto) {
    const customerId = req.user.id || req.user.userId || req.user.sub;
    const result = await this.ratingService.createRating(customerId, dto);
    return {
      success: true,
      data: result,
    };
  }
}
