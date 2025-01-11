import { Module } from '@nestjs/common';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [NoteController],
  providers: [NoteService, PrismaService, DynamoDBService],
  exports: [NoteService],
})
export class NoteModule {}
