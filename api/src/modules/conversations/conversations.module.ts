import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { Conversation, Message } from './conversation.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Listing])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
