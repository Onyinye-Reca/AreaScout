import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';
/** Route is reachable without a session; a valid session is still honoured. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
