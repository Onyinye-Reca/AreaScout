import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { SavedListing } from './saved-listing.entity';
import { SavedController } from './saved.controller';
import { SavedService } from './saved.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedListing, Listing])],
  controllers: [SavedController],
  providers: [SavedService],
})
export class SavedModule {}
