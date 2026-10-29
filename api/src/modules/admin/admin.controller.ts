import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { ModerateReviewDto, UpdateUserDto } from './dto/admin.dto';

/** Listing moderation lives in ListingsController and report triage in ReportsController. */
@ApiTags('admin')
@Roles('admin')
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ResponseMessage('Successfully fetched dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('listings')
  @ResponseMessage('Successfully fetched listings awaiting review')
  listings() {
    return this.admin.pendingListings();
  }

  @Get('area-reviews')
  @ResponseMessage('Successfully fetched area reports awaiting review')
  reviews() {
    return this.admin.pendingReviews();
  }

  @Patch('area-reviews/:id')
  @ResponseMessage('Area report moderated')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.admin.moderateReview(parseId(id, 'report ID'), dto);
  }

  @Get('users')
  @ResponseMessage('Successfully fetched users')
  users(@Query('q') q?: string, @Query('role') role?: string) {
    return this.admin.listUsers(q?.trim() || undefined, role);
  }

  @Patch('users/:id')
  @ResponseMessage('User updated')
  updateUser(@CurrentUser() admin: User, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(admin.id, parseId(id, 'user ID'), dto);
  }
}
