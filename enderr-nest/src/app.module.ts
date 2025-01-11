import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from './prisma.service';
import { DynamoDBService } from './dynamodb.service';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { NoteModule } from './note/note.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { HealthController } from './health/health.controller';

/**
 * Root module of the application
 *
 * @remarks Database Connections:
 * - PostgreSQL via Prisma: Main database for full entity data
 * - DynamoDB: Fast access to weekly schedule views and note operations
 *
 * @remarks Core Features:
 * - Authentication: Google OAuth2 with JWT
 * - Schedules: Weekly calendar with drag-and-drop support
 * - Notes: Collaborative markdown editing with block-based operations
 * - Health Checks: Monitoring endpoints for all services
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      cache: true,
      validate: validateEnv,
    }),
    TerminusModule,
    LoggerModule,
    AuthModule,
    ScheduleModule,
    NoteModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService, DynamoDBService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
