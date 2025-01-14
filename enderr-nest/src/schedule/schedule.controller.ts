import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { ScheduleService } from './schedule.service';
import { CustomLogger } from '../logger/logger.service';
import { UserFromJwt } from '../auth/types/user';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  private readonly logger = new Logger(ScheduleController.name);

  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly customLogger: CustomLogger,
  ) {
    this.customLogger.setContext(ScheduleController.name);
  }

  /**
   * Create a new schedule
   */
  @Post()
  async createSchedule(@Body() schedule: any, @User() user: UserFromJwt) {
    this.logger.debug('Creating schedule', { userId: user.id });
    return this.scheduleService.create(schedule, user.id);
  }

  /**
   * Get all schedules for the authenticated user
   */
  @Get()
  async getSchedules(@User() user: UserFromJwt) {
    this.logger.debug('Getting all schedules', { userId: user.id });
    return this.scheduleService.findAll(user.id);
  }

  /**
   * Get a specific schedule by ID
   */
  @Get(':id')
  async getSchedule(@Param('id') id: string, @User() user: UserFromJwt) {
    this.logger.debug('Getting schedule', { scheduleId: id, userId: user.id });
    const schedule = await this.scheduleService.findOne(id);

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.creatorId !== user.id) {
      this.logger.warn('Unauthorized schedule access attempt', {
        scheduleId: id,
        userId: user.id,
      });
      throw new ForbiddenException('Not authorized to access this schedule');
    }

    return schedule;
  }

  /**
   * Update a schedule
   */
  @Patch(':id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() updates: any,
    @User() user: UserFromJwt,
  ) {
    this.logger.debug('Updating schedule', { scheduleId: id, userId: user.id });
    const schedule = await this.scheduleService.findOne(id);

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.creatorId !== user.id) {
      this.logger.warn('Unauthorized schedule update attempt', {
        scheduleId: id,
        userId: user.id,
      });
      throw new ForbiddenException('Not authorized to update this schedule');
    }

    return this.scheduleService.update(id, updates);
  }

  /**
   * Delete a schedule
   */
  @Delete(':id')
  async deleteSchedule(@Param('id') id: string, @User() user: UserFromJwt) {
    this.logger.debug('Deleting schedule', { scheduleId: id, userId: user.id });
    const schedule = await this.scheduleService.findOne(id);

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.creatorId !== user.id) {
      this.logger.warn('Unauthorized schedule deletion attempt', {
        scheduleId: id,
        userId: user.id,
      });
      throw new ForbiddenException('Not authorized to delete this schedule');
    }

    await this.scheduleService.delete(id);
    return { message: 'Schedule deleted successfully' };
  }
}
