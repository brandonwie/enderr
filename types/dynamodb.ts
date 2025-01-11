/**
 * DynamoDB schema for today's schedules
 * Using composite key pattern for efficient queries
 * GSI1 is used for quick time-based lookups
 *
 * @note Alternative approaches:
 * 1. Redis cache with TTL (if very high read throughput is needed)
 * 2. ElastiCache for more complex query patterns
 * 3. Application-level caching with React Query/SWR
 */
interface TodayScheduleDDB {
  // Partition key: user#<userId>#date#<YYYY-MM-DD>
  pk: string;
  // Sort key: time#<HHmm>#schedule#<scheduleId>
  sk: string;
  // GSI1PK: status#active
  GSI1PK: string;
  // GSI1SK: time#<HHmm>
  GSI1SK: string;

  scheduleId: string;
  title: string;
  startTime: number;
  endTime: number;
  // Cached fields for quick display
  location?: string;
  meetingLink?: string;
  tagIds?: string[];

  // TTL field for automatic cleanup
  expiresAt: number; // Unix timestamp
}
