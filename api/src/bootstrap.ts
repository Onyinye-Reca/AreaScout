import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Env } from './config/env';

/** Shared by main.ts and e2e tests so both run the same HTTP stack. */
export function applyAppSettings(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const swaggerEnabled =
    config.get('NODE_ENV', { infer: true }) !== 'production' || config.get('SWAGGER_ENABLED', { infer: true });

  // Behind a reverse proxy the client's address is in X-Forwarded-For; without this every user shares one rate limit.
  if (config.get('TRUST_PROXY', { infer: true })) (app as NestExpressApplication).set('trust proxy', 1);

  // Helmet's default CSP blocks Swagger UI's inline scripts.
  app.use(helmet({ contentSecurityPolicy: swaggerEnabled ? false : undefined }));
  app.use(compression());

  // Uploaded listing photos are public (they appear on public listings).
  (app as NestExpressApplication).useStaticAssets(config.get('UPLOAD_DIR', { infer: true }), { prefix: '/uploads/' });

  const origin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({ origin: origin === '*' ? true : origin.split(',').map((o) => o.trim()) });

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('AreaScout API')
        .setDescription('Listings, neighbourhood intelligence, inspections, messaging and moderation')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));
  }
}
