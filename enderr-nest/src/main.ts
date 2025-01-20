import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

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

  // CORS configuration
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
