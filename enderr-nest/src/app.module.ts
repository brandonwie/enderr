import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { DynamoDBService } from './dynamodb.service';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { CustomLogger } from './logger/logger.service';

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
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, DynamoDBService, CustomLogger],
})
export class AppModule {}
