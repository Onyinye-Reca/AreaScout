import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { CreateListerReviewDto, ModerateListerReviewDto } from './dto/lister-review.dto';
import { ListerReviewsService } from './lister-reviews.service';

@ApiTags('lister-reviews')
@Controller('v1')
export class ListerReviewsController {
  constructor(private readonly reviews: ListerReviewsService) {}

  @Roles('tenant')
  @Post('lister-reviews')
  @ResponseMessage('Thanks for your review')
  create(@CurrentUser() user: User, @Body() dto: CreateListerReviewDto) {
    return this.reviews.create(user, dto);
  }

  @Public()
  @Get('listers/:id/reviews')
  @ResponseMessage('Successfully fetched reviews')
  forLister(@Param('id') id: string) {
    return this.reviews.forLister(parseId(id, 'lister ID'));
  }

  @Roles('admin')
  @Get('admin/lister-reviews')
  @ResponseMessage('Successfully fetched reviews')
  recent() {
    return this.reviews.recentForAdmin();
  }

  @Roles('admin')
  @Patch('admin/lister-reviews/:id')
  @ResponseMessage('Review updated')
  moderate(@CurrentUser() admin: User, @Param('id') id: string, @Body() dto: ModerateListerReviewDto) {
    return this.reviews.moderate(parseId(id, 'review ID'), dto, admin);
  }
}
