import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { AreaReview } from './area-review.entity';
import { Area } from './area.entity';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Area, AreaReview, Listing])],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [TypeOrmModule, AreasService],
})
export class AreasModule {}
