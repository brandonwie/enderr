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
 * @description Provides endpoints to monitor the application's health status.
 * All checks return a standardized response format:
 * ```typescript
 * {
 *   status: 'ok' | 'error',
 *   info?: { [key: string]: { status: string } },
 *   error?: { [key: string]: { status: string, message: string } },
 *   details: { [key: string]: { status: string } }
 * }
 * ```
 *
 * @endpoints
 * - GET /health - Full health check of all services
 * - GET /health/ping - Quick liveness probe
 *
 * @thresholds
 * - Disk Storage: 90% usage threshold (thresholdPercent: 0.9)
 *   - Status becomes 'error' if disk usage exceeds 90%
 *   - Useful for preventing disk space issues
 *
 * - Memory Heap: 300MB threshold (300 * 1024 * 1024 bytes)
 *   - Status becomes 'error' if heap usage exceeds 300MB
 *   - Helps detect memory leaks and high memory usage
 *
 * @database
 * - PostgreSQL: Uses Prisma's built-in health check
 *   - Verifies database connection and query execution
 *
 * - DynamoDB: Custom health check
 *   - Attempts a simple scan operation
 *   - Useful for verifying AWS credentials and table access
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
   *
   * @returns Health check results for all monitored services
   *
   * @example Response when all services are healthy:
   * ```json
   * {
   *   "status": "ok",
   *   "info": {
   *     "postgresql": { "status": "up" },
   *     "dynamodb": { "status": "up" },
   *     "storage": { "status": "up" },
   *     "memory_heap": { "status": "up" }
   *   }
   * }
   * ```
   *
   * @example Response when disk space is low:
   * ```json
   * {
   *   "status": "error",
   *   "error": {
   *     "storage": {
   *       "status": "down",
   *       "message": "Disk usage exceeds 90% threshold"
   *     }
   *   },
   *   "info": {
   *     "postgresql": { "status": "up" },
   *     "dynamodb": { "status": "up" },
   *     "memory_heap": { "status": "up" }
   *   }
   * }
   * ```
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
          thresholdPercent: 0.9, // 90% disk usage threshold
        }),
      async () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB heap usage threshold
    ]);
  }

  /**
   * Quick ping endpoint for basic liveness probe
   *
   * @returns Simple OK response
   *
   * @example Response:
   * ```json
   * {
   *   "status": "ok"
   * }
   * ```
   *
   * @remarks
   * This endpoint is useful for:
   * - Kubernetes liveness probes
   * - Load balancer health checks
   * - Basic application availability monitoring
   */
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }
}
