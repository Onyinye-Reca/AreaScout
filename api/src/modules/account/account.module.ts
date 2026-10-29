import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaReview } from '../areas/area-review.entity';
import { Session } from '../auth/session.entity';
import { Conversation, Message } from '../conversations/conversation.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Listing } from '../listings/listing.entity';
import { ListingsModule } from '../listings/listings.module';
import { ListingReport } from '../reports/listing-report.entity';
import { SavedListing } from '../saved/saved-listing.entity';
import { User } from '../users/user.entity';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { SavedSearch } from './saved-search.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, SavedSearch, SavedListing, Listing, Inspection, Conversation, Message, AreaReview, ListingReport]),
    ListingsModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
