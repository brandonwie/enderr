import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';
import { CustomLogger } from '../logger/logger.service';
import { Schedule, ScheduleStatus } from '@shared/types/schedule';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamodb: DynamoDBService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(ScheduleService.name);
  }

  /**
   * Find all schedules for a user
   */
  async findAll(userId: string) {
    return this.prisma.schedule.findMany({
      where: {
        OR: [{ creatorId: userId }, { participants: { some: { id: userId } } }],
      },
      include: {
        creator: true,
        participants: true,
        notes: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Find a specific schedule by ID
   */
  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
      include: {
        creator: true,
        participants: true,
        notes: true,
      },
    });
  }

  /**
   * Create a new schedule
   */
  async create(data: Partial<Schedule>, userId: string) {
    // Create in PostgreSQL
    const schedule = await this.prisma.schedule.create({
      data: {
        title: data.title || '',
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration || 30,
        status: data.status || ScheduleStatus.INBOX,
        location: data.location,
        creator: {
          connect: { id: userId },
        },
        participants: {
          connect: data.participants?.map((p) => ({ id: p.id })) || [],
        },
      },
      include: {
        creator: true,
        participants: true,
        notes: true,
      },
    });

    // If it's a scheduled item (not inbox), update DynamoDB
    if (schedule.startTime && schedule.endTime) {
      const weekStart = this.getWeekStart(schedule.startTime);
      const day = this.getDayOfWeek(schedule.startTime);

      await this.dynamodb.addScheduleToDay(userId, weekStart, day, {
        id: schedule.id,
        title: schedule.title,
        startTime: schedule.startTime.toISOString(),
        endTime: schedule.endTime.toISOString(),
      });
    }

    return schedule;
  }

  /**
   * Update a schedule
   */
  async update(id: string, data: Partial<Schedule>) {
    // Convert shared type to Prisma input type
    const updateData: Prisma.ScheduleUpdateInput = {
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      status: data.status,
      location: data.location,
      participants: data.participants
        ? {
            set: [], // Clear existing
            connect: data.participants.map((p) => ({ id: p.id })),
          }
        : undefined,
    };

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
        participants: true,
        notes: true,
      },
    });

    // If time/date changed, update DynamoDB
    if (data.startTime || data.endTime) {
      const weekStart = this.getWeekStart(schedule.startTime);
      const day = this.getDayOfWeek(schedule.startTime);

      await this.dynamodb.updateSchedulePosition(
        schedule.creatorId,
        weekStart,
        day,
        schedule.id,
        {
          startTime: schedule.startTime.toISOString(),
          endTime: schedule.endTime.toISOString(),
          order: 0, // Will be sorted by time
        },
      );
    }

    return schedule;
  }

  /**
   * Delete a schedule
   * @remarks This will remove the schedule from both PostgreSQL and DynamoDB
   */
  async delete(id: string) {
    // First get the schedule to know what to clean up in DynamoDB
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        creator: true,
      },
    });

    if (!schedule) return;

    // Delete from PostgreSQL first
    await this.prisma.schedule.delete({ where: { id } });

    // If it was a scheduled item (not in inbox), remove from DynamoDB
    if (schedule.startTime && schedule.endTime) {
      const weekStart = this.getWeekStart(schedule.startTime);
      const day = this.getDayOfWeek(schedule.startTime);

      // Get current week's schedules
      const weekSchedules = await this.dynamodb.getWeeklySchedules(
        schedule.creatorId,
        weekStart,
      );

      if (weekSchedules) {
        // Filter out the deleted schedule
        const updatedDaySchedules = weekSchedules.schedules[day].filter(
          (s) => s.id !== id,
        );

        // Update DynamoDB with filtered schedules
        await this.dynamodb.updateDaySchedules(
          schedule.creatorId,
          weekStart,
          day,
          updatedDaySchedules,
        );

        this.logger.log(`Deleted schedule ${id} from PostgreSQL and DynamoDB`, {
          userId: schedule.creatorId,
          weekStart,
          day,
        });
      }
    } else {
      this.logger.log(`Deleted inbox schedule ${id} from PostgreSQL`, {
        userId: schedule.creatorId,
      });
    }
  }

  /**
   * Get week start date in ISO format
   */
  private getWeekStart(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  /**
   * Get day of week as monday, tuesday, etc.
   */
  private getDayOfWeek(
    date: Date,
  ): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' {
    const days: Record<
      number,
      'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
    > = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
    };
    return days[date.getDay()] || 'monday';
  }
}
