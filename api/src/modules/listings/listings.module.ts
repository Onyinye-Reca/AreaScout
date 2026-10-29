import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListerReviewsModule } from '../lister-reviews/lister-reviews.module';
import { Conversation } from '../conversations/conversation.entity';
import { SavedListing } from '../saved/saved-listing.entity';
import { Area } from '../areas/area.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { Listing } from './listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Area, SavedListing, Conversation]), ListerReviewsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [TypeOrmModule, ListingsService],
})
export class ListingsModule {}
