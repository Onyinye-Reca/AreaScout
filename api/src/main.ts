import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { applyAppSettings } from './bootstrap';
import { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.useLogger(app.get(Logger));
  applyAppSettings(app);
  app.enableShutdownHooks();

  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`AreaScout API listening on port ${port}`);
}

void bootstrap();
