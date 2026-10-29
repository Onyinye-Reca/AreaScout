import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { ConversationsService } from './conversations.service';
import { SendMessageDto, StartConversationDto } from './dto/conversation.dto';

@ApiTags('conversations')
@Controller('v1/conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Roles('tenant')
  @Post()
  @HttpCode(201)
  @ResponseMessage('Message sent')
  start(@CurrentUser() user: User, @Body() dto: StartConversationDto) {
    return this.conversations.start(user, dto.listing_id, dto.message);
  }

  @Get()
  @ResponseMessage('Successfully fetched conversations')
  list(@CurrentUser() user: User) {
    return this.conversations.list(user);
  }

  @Get(':id')
  @ResponseMessage('Successfully fetched conversation')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.conversations.get(user, parseId(id, 'conversation ID'));
  }

  @Post(':id/messages')
  @ResponseMessage('Message sent')
  send(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversations.send(user, parseId(id, 'conversation ID'), dto.message);
  }
}
