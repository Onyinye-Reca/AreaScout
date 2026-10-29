import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordReset } from './password-reset.entity';
import { Session } from './session.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Session, PasswordReset]), UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
