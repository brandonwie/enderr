import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService, PrismaService, DynamoDBService],
})
export class ScheduleModule {}
