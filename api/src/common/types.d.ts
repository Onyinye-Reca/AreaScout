import { User } from '../modules/users/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionTokenHash?: string;
    }
  }
}
export {};
