import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../modules/users/user.entity';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User | undefined =>
    ctx.switchToHttp().getRequest<Request>().user,
);
