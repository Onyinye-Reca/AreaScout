import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { AdminListingDto, CreateListingDto, SearchListingsDto, UpdateListingDto } from './dto/listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('listings')
@Controller('v1')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Public()
  @Get('listings')
  @ResponseMessage('Successfully fetched listings')
  search(@Query() query: SearchListingsDto) {
    return this.listings.search(query);
  }

  @Roles('landlord', 'agent')
  @Get('my/listings')
  @ResponseMessage('Successfully fetched your listings')
  mine(@CurrentUser() user: User) {
    return this.listings.mine(user);
  }

  @Public()
  @Get('listings/:id')
  @ResponseMessage('Successfully fetched listing')
  get(@Param('id') id: string, @CurrentUser() viewer?: User) {
    return this.listings.get(parseId(id, 'listing ID'), viewer);
  }

  @Roles('landlord', 'agent')
  @Post('listings')
  @ResponseMessage('Listing submitted')
  create(@CurrentUser() user: User, @Body() dto: CreateListingDto) {
    return this.listings.create(user, dto);
  }

  @Roles('landlord', 'agent')
  @Patch('listings/:id')
  @ResponseMessage('Listing updated and sent for review')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listings.update(user, parseId(id, 'listing ID'), dto);
  }

  @Roles('admin')
  @Patch('admin/listings/:id')
  @ResponseMessage('Listing moderated')
  moderate(@Param('id') id: string, @Body() dto: AdminListingDto) {
    return this.listings.moderate(parseId(id, 'listing ID'), dto);
  }

  @Roles('landlord', 'agent', 'admin')
  @Delete('listings/:id')
  @ResponseMessage('Listing removed')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.listings.remove(user, parseId(id, 'listing ID'));
  }
}
