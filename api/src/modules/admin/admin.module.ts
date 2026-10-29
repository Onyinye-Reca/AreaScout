import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaReview } from '../areas/area-review.entity';
import { Listing } from '../listings/listing.entity';
import { ListingReport } from '../reports/listing-report.entity';
import { ReportsModule } from '../reports/reports.module';
import { User } from '../users/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, AreaReview, ListingReport, User]), ReportsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
