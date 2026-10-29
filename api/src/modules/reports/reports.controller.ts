import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { ReportListingDto, ResolveListingDto, UpdateReportDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('v1')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('listings/:id/report')
  @ResponseMessage('Report received')
  report(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ReportListingDto) {
    return this.reports.report(user, parseId(id, 'listing ID'), dto);
  }

  @Roles('admin')
  @Get('admin/reports')
  @ResponseMessage('Successfully fetched reports')
  async queue() {
    return { reports: await this.reports.groups() };
  }

  @Roles('admin')
  @Get('admin/reports/listing/:id')
  @ResponseMessage('Successfully fetched reports for listing')
  group(@Param('id') id: string) {
    return this.reports.group(parseId(id, 'listing ID'));
  }

  @Roles('admin')
  @Post('admin/reports/listing/:id/resolve')
  @ResponseMessage('Reports resolved')
  resolveListing(@Param('id') id: string, @Body() dto: ResolveListingDto) {
    return this.reports.resolveListing(parseId(id, 'listing ID'), dto);
  }

  @Roles('admin')
  @Patch('admin/reports/:id')
  @ResponseMessage('Report updated')
  resolve(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reports.resolve(parseId(id, 'report ID'), dto);
  }
}
