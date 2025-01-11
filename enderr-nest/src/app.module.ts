import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { DynamoDBService } from './dynamodb.service';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

/**
 * Root module of the application
 *
 * @remarks Database Connections:
 * - PostgreSQL via Prisma: Main database for full entity data
 * - DynamoDB: Fast access to weekly schedule views
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule,
    AuthModule,
    ScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, DynamoDBService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
