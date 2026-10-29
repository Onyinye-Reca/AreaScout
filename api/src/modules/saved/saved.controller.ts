import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { SavedService } from './saved.service';

@ApiTags('saved')
@Roles('tenant')
@Controller('v1/saved')
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  @ResponseMessage('Successfully fetched saved homes')
  list(@CurrentUser() user: User) {
    return this.saved.list(user);
  }

  @Post(':id')
  @HttpCode(200)
  @ResponseMessage('Home saved')
  add(@CurrentUser() user: User, @Param('id') id: string) {
    return this.saved.add(user, parseId(id, 'listing ID'));
  }

  @Delete(':id')
  @ResponseMessage('Home removed from saved')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.saved.remove(user, parseId(id, 'listing ID'));
  }
}
