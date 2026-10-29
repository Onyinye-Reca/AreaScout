import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { AreasService } from './areas.service';
import { CreateAreaReviewDto } from './dto/area.dto';

@ApiTags('areas')
@Controller('v1')
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Public()
  @Get('locations')
  @ResponseMessage('Successfully fetched locations')
  locations() {
    return this.areas.locations();
  }

  @Public()
  @Get('areas')
  @ResponseMessage('Successfully fetched areas')
  list(@Query('city') city?: string) {
    return this.areas.list(city?.trim() || undefined);
  }

  @Public()
  @Get('areas/:slug')
  @ResponseMessage('Successfully fetched area report')
  get(@Param('slug') slug: string) {
    return this.areas.get(slug);
  }

  @Roles('tenant')
  @Post('area-reviews')
  @ResponseMessage('Area report submitted for review')
  create(@CurrentUser() user: User, @Body() dto: CreateAreaReviewDto) {
    return this.areas.createReview(user, dto);
  }
}
