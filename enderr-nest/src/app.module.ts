import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { DynamoDBService } from './dynamodb.service';
import { validateEnv } from './config/env.validation';

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
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, DynamoDBService],
})
export class AppModule {}
