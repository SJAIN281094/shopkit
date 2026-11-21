import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  CustomLoggerService,
  HttpLoggingInterceptor,
  RequestContextService,
} from '@arhaminnovations/nestjs-pino-logger';
import { AppModule } from './app.module';
import { SHOP_HEADER } from './common/shop-access.guard';
import type { AppConfig } from './config/configuration';
import { StorageService } from './modules/storage/storage.service';

async function bootstrap() {
  // rawBody: Razorpay webhook signatures are computed over the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  if (config.get('storage', { infer: true }).driver === 'local') {
    app.useStaticAssets(app.get(StorageService).localRoot, {
      prefix: '/uploads/',
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, path) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        // Browsers only load cross-origin @font-face files that carry a CORS header.
        if (/\.(woff2?|ttf|otf)$/i.test(path)) res.setHeader('Access-Control-Allow-Origin', '*');
      },
    });
  }

  const logger = app.get(CustomLoggerService);
  app.useLogger(logger);
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(logger.forContext('HttpLoggingInterceptor'), app.get(RequestContextService)),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: config.get('allowedOrigins', { infer: true }),
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', SHOP_HEADER],
    credentials: true,
  });

  const port = config.get('port', { infer: true });
  await app.listen(port);
  logger.log(`API ready at http://localhost:${port}/graphql`, 'Bootstrap');
}

void bootstrap();
