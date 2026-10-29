import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService, hashToken } from '../../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Global guard: resolves the bearer session on every request, then enforces
 * @Roles on protected routes. Public routes accept anonymous callers.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') return true;

    const header = request.headers.authorization ?? '';
    if (/^bearer /i.test(header)) {
      const token = header.slice(7).trim();
      const user = await this.auth.userForToken(token);
      if (user) {
        request.user = user;
        request.sessionTokenHash = hashToken(token);
      }
    }

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    if (!request.user) throw new UnauthorizedException('Sign in to continue');

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenException('Your account role cannot perform this action');
    }
    return true;
  }
}
