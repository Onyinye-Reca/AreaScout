import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { User } from '../users/user.entity';
import { AuthService, publicUser } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

/** Stricter than the global limit: these are what password guessing and account farming hit. */
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('v1')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(AUTH_LIMIT)
  @Public()
  @Post('auth/register')
  @ResponseMessage('Account created')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle(AUTH_LIMIT)
  @Public()
  @Post('auth/login')
  @HttpCode(200)
  @ResponseMessage('Signed in')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Throttle(AUTH_LIMIT)
  @Public()
  @Post('auth/forgot-password')
  @HttpCode(200)
  @ResponseMessage('If that email has an account, we’ve sent a code')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return { ok: true };
  }

  @Throttle(AUTH_LIMIT)
  @Public()
  @Post('auth/reset-password')
  @HttpCode(200)
  @ResponseMessage('Password reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { ok: true };
  }

  @Post('auth/logout')
  @HttpCode(200)
  @ResponseMessage('Signed out')
  async logout(@Req() req: Request) {
    await this.auth.logout(req.sessionTokenHash);
    return { ok: true };
  }

  @Get('me')
  @ResponseMessage('Current account')
  me(@CurrentUser() user: User) {
    return { user: publicUser(user) };
  }
}
