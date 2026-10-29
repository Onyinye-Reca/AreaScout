import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { StorageModule } from './common/storage/storage.service';
import { MailerModule } from './common/mail/mailer.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Env, validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { postgresOptions } from './database/postgres-options';
import { AccountModule } from './modules/account/account.module';
import { AdminModule } from './modules/admin/admin.module';
import { AreasModule } from './modules/areas/areas.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { HealthModule } from './modules/health/health.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ListerReviewsModule } from './modules/lister-reviews/lister-reviews.module';
import { OwnerModule } from './modules/owner/owner.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SavedModule } from './modules/saved/saved.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req, res) => {
            const existing = req.headers['x-request-id'];
            const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          serializers: {
            req: (req) => ({ id: req.id, method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
          customReceivedMessage: (req) => `--> ${req.method} ${req.url}`,
          customSuccessMessage: (req, res, ms) => `<-- ${req.method} ${req.url} ${res.statusCode} (${ms}ms)`,
          customErrorMessage: (req, res) => `<-- ${req.method} ${req.url} ${res.statusCode} (error)`,
          ...(config.get('NODE_ENV', { infer: true }) === 'development' && process.stdout.isTTY
            ? { transport: { target: 'pino-pretty', options: { singleLine: true, colorize: true, ignore: 'pid,hostname,req,res,responseTime' } } }
            : {}),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => {
        if (config.get('DB_TYPE', { infer: true }) === 'postgres') {
          const get = <K extends keyof Env>(k: K): Env[K] => config.get(k, { infer: true });
          return {
            ...postgresOptions({
              DATABASE_URL: get('DATABASE_URL'), DB_HOST: get('DB_HOST'), DB_PORT: get('DB_PORT'), DB_USERNAME: get('DB_USERNAME'),
              DB_PASSWORD: get('DB_PASSWORD'), DB_NAME: get('DB_NAME'), DB_SCHEMA: get('DB_SCHEMA'), DB_SSL: get('DB_SSL'), DB_SSL_CA: get('DB_SSL_CA'),
              DB_SSL_REJECT_UNAUTHORIZED: get('DB_SSL_REJECT_UNAUTHORIZED'), DB_MIGRATIONS_RUN: get('DB_MIGRATIONS_RUN'),
            }),
            autoLoadEntities: true,
          };
        }
        const database = config.get('DB_PATH', { infer: true });
        if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
        return { type: 'better-sqlite3', database, autoLoadEntities: true, synchronize: true };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
        // Read per request (not once at start-up) so tests can switch limiting on for a single app.
        skipIf: () => (process.env.RATE_LIMIT ?? String(config.get('RATE_LIMIT', { infer: true }))) === 'false',
      }),
    }),
    MailerModule,
    StorageModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    AreasModule,
    ListingsModule,
    SavedModule,
    InspectionsModule,
    ConversationsModule,
    ReportsModule,
    AdminModule,
    AccountModule,
    ListerReviewsModule,
    OwnerModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    // ResponseInterceptor is outermost so the envelope wraps the serialized payload.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
