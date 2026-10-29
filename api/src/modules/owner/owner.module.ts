import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation, Message } from '../conversations/conversation.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Listing } from '../listings/listing.entity';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Inspection, Conversation, Message])],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
