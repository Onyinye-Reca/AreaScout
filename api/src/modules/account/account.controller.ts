import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { parseId } from '../../common/util';
import { User } from '../users/user.entity';
import { AccountService } from './account.service';
import { ChangePasswordDto, CreateSavedSearchDto, DeleteAccountDto, PreferencesDto, UpdateProfileDto, UpdateSavedSearchDto } from './dto/account.dto';

@ApiTags('account')
@Controller('v1')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Patch('me')
  @ResponseMessage('Profile updated')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.account.updateProfile(user, dto);
  }

  @Post('me/password')
  @HttpCode(200)
  @ResponseMessage('Password changed')
  changePassword(@CurrentUser() user: User, @Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(user, req.sessionTokenHash, dto);
  }

  @Get('me/preferences')
  @ResponseMessage('Successfully fetched preferences')
  preferences(@CurrentUser() user: User) {
    return this.account.preferences(user);
  }

  @Put('me/preferences')
  @ResponseMessage('Preferences saved')
  setPreferences(@CurrentUser() user: User, @Body() dto: PreferencesDto) {
    return this.account.setPreferences(user, dto);
  }

  @Get('me/export')
  @ResponseMessage('Your data')
  exportData(@CurrentUser() user: User) {
    return this.account.exportData(user);
  }

  @Delete('me')
  @ResponseMessage('Account deleted')
  deleteAccount(@CurrentUser() user: User, @Body() dto: DeleteAccountDto) {
    return this.account.deleteAccount(user, dto.password);
  }

  @Roles('tenant')
  @Get('saved-searches')
  @ResponseMessage('Successfully fetched saved searches')
  searches(@CurrentUser() user: User) {
    return this.account.listSearches(user);
  }

  @Roles('tenant')
  @Post('saved-searches')
  @ResponseMessage('Search saved')
  createSearch(@CurrentUser() user: User, @Body() dto: CreateSavedSearchDto) {
    return this.account.createSearch(user, dto);
  }

  @Roles('tenant')
  @Patch('saved-searches/:id')
  @ResponseMessage('Saved search updated')
  updateSearch(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateSavedSearchDto) {
    return this.account.updateSearch(user, parseId(id, 'search ID'), dto);
  }

  @Roles('tenant')
  @Post('saved-searches/:id/seen')
  @HttpCode(200)
  @ResponseMessage('Marked as seen')
  seen(@CurrentUser() user: User, @Param('id') id: string) {
    return this.account.markSeen(user, parseId(id, 'search ID'));
  }

  @Roles('tenant')
  @Delete('saved-searches/:id')
  @ResponseMessage('Saved search removed')
  deleteSearch(@CurrentUser() user: User, @Param('id') id: string) {
    return this.account.deleteSearch(user, parseId(id, 'search ID'));
  }
}
