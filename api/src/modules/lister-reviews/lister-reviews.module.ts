import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inspection } from '../inspections/inspection.entity';
import { User } from '../users/user.entity';
import { ListerReview } from './lister-review.entity';
import { ListerReviewsController } from './lister-reviews.controller';
import { ListerReviewsService } from './lister-reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([ListerReview, Inspection, User])],
  controllers: [ListerReviewsController],
  providers: [ListerReviewsService],
  exports: [ListerReviewsService],
})
export class ListerReviewsModule {}
