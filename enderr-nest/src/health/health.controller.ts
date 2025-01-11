import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';
import { CustomLogger } from '../logger/logger.service';

/**
 * Health Check Controller
 *
 * @remarks Provides endpoints to monitor:
 * - Database connections (PostgreSQL, DynamoDB)
 * - System resources (Disk space, Memory usage)
 * - Overall application status
 */
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private diskHealth: DiskHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private prisma: PrismaService,
    private dynamodb: DynamoDBService,
    private logger: CustomLogger,
  ) {}

  /**
   * Check overall application health
   * @returns Health check results for all monitored services
   */
  @Get()
  @HealthCheck()
  async check() {
    this.logger.log('Running health check');
    return this.health.check([
      // Database checks
      async () => this.prismaHealth.pingCheck('postgresql', this.prisma),
      async () => ({
        dynamodb: {
          status: (await this.dynamodb.isHealthy()) ? 'up' : 'down',
        },
      }),

      // System checks
      async () =>
        this.diskHealth.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      async () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
    ]);
  }

  /**
   * Quick ping endpoint for basic liveness probe
   * @returns Simple OK response
   */
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }
}
