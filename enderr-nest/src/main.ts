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
 * @note CORS is enabled for development
 * - In production, you might want to restrict origins
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

  // Enable CORS for development
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:3000',
    credentials: true,
  });

  // Get port from environment variables
  const port = process.env.PORT || 5000;

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
