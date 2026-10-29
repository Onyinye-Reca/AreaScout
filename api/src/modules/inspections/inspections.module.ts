import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListerReviewsModule } from '../lister-reviews/lister-reviews.module';
import { Listing } from '../listings/listing.entity';
import { Inspection } from './inspection.entity';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inspection, Listing]), ListerReviewsModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
