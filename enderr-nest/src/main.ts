import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { CustomLogger } from './logger/logger.service';

/**
 * Bootstrap function to start the NestJS application
 *
 * @note Validation setup:
 * - transform: automatically transform payloads to DTO instances
 * - whitelist: strip properties that aren't decorated with validation decorators
 * - forbidNonWhitelisted: throw error if non-whitelisted properties are present
 *
 * @note CORS configuration:
 * - Development: allows localhost:3000
 * - Production: uses FRONTEND_URL from env
 * - Credentials enabled for cookie support
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Cookie parser middleware with JWT secret for signed cookies
  app.use(cookieParser(process.env.JWT_SECRET));

  // CORS configuration
  app.enableCors({
    origin: '*',
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
