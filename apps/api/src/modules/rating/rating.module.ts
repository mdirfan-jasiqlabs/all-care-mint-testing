import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RatingService } from './services/rating.service';
import { AdminRatingController, CustomerRatingController } from './controllers/rating.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminRatingController, CustomerRatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
