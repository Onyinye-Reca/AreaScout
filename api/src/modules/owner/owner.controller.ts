import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { OwnerService } from './owner.service';

@ApiTags('owner')
@Roles('landlord', 'agent')
@Controller('v1/my')
export class OwnerController {
  constructor(private readonly owner: OwnerService) {}

  @Get('dashboard')
  @ResponseMessage('Successfully fetched dashboard')
  dashboard(@CurrentUser() user: User) {
    return this.owner.dashboard(user);
  }
}
