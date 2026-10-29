import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { CreateInspectionDto, UpdateInspectionDto } from './dto/inspection.dto';
import { InspectionsService } from './inspections.service';

@ApiTags('inspections')
@Controller('v1/inspections')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Roles('tenant')
  @Post()
  @ResponseMessage('Inspection requested')
  create(@CurrentUser() user: User, @Body() dto: CreateInspectionDto) {
    return this.inspections.create(user, dto);
  }

  @Get()
  @ResponseMessage('Successfully fetched inspections')
  list(@CurrentUser() user: User) {
    return this.inspections.list(user);
  }

  @Patch(':id')
  @ResponseMessage('Inspection updated')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateInspectionDto) {
    return this.inspections.update(user, parseId(id, 'inspection ID'), dto);
  }
}
