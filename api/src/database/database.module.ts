import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaReview } from '../modules/areas/area-review.entity';
import { Area } from '../modules/areas/area.entity';
import { Listing } from '../modules/listings/listing.entity';
import { User } from '../modules/users/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Area, User, Listing, AreaReview])],
  providers: [SeedService],
})
export class DatabaseModule {}
