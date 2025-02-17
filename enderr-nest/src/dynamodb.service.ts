import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDB } from 'aws-sdk';
import { WeeklySchedules, DailySchedule } from '@shared/types/schedule';

/**
 * Service for handling DynamoDB operations
 * @remarks Specifically for managing weekly schedule views and note operations
 */
@Injectable()
export class DynamoDBService implements OnModuleInit, OnModuleDestroy {
  private client: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isDevelopment = nodeEnv !== 'production';
    this.tableName = this.configService.get<string>('DYNAMODB_TABLE_NAME');

    const config: DynamoDB.ClientConfiguration = {
      region: this.configService.get<string>('AWS_REGION', 'local'),
    };

    if (this.isDevelopment) {
      config.endpoint = 'http://localhost:8000';
      config.credentials = {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      };
    } else {
      config.credentials = {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      };
    }

    this.client = new DynamoDB.DocumentClient(config);
  }

  async onModuleInit() {
    if (this.isDevelopment) {
      // Create table in local DynamoDB if it doesn't exist
      const dynamodb = new DynamoDB({
        endpoint: 'http://localhost:8000',
        region: 'local',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
      });

      try {
        await dynamodb
          .createTable({
            TableName: this.tableName,
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'weekStart', KeyType: 'RANGE' },
            ],
            AttributeDefinitions: [
              { AttributeName: 'userId', AttributeType: 'S' },
              { AttributeName: 'weekStart', AttributeType: 'S' },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          })
          .promise();
        console.log('Local DynamoDB table created');
      } catch (error) {
        // Table might already exist, which is fine
        if (error.code !== 'ResourceInUseException') {
          console.error('Failed to create local DynamoDB table:', error);
          throw error;
        }
      }
    }

    // Verify connection
    try {
      await this.client.scan({ TableName: this.tableName, Limit: 1 }).promise();
      console.log(
        `DynamoDB connection established (${this.isDevelopment ? 'development' : 'production'})`,
      );
    } catch (error) {
      console.error('Failed to connect to DynamoDB:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // Clean up if needed
  }

  /**
   * Get weekly schedules for a user
   * @param userId - The user's ID
   * @param weekStart - Start of the week in ISO format
   */
  async getWeeklySchedules(
    userId: string,
    weekStart: string,
  ): Promise<WeeklySchedules | null> {
    const result = await this.client
      .get({
        TableName: this.tableName,
        Key: {
          userId,
          weekStart,
        },
      })
      .promise();

    return result.Item as WeeklySchedules;
  }

  /**
   * Update weekly schedules
   * @param weeklySchedules - The updated weekly schedules
   */
  async updateWeeklySchedules(weeklySchedules: WeeklySchedules): Promise<void> {
    await this.client
      .put({
        TableName: this.tableName,
        Item: weeklySchedules,
      })
      .promise();
  }

  /**
   * Update schedules for a specific day
   * @param userId - The user's ID
   * @param weekStart - Start of the week in ISO format
   * @param day - Day of the week (monday, tuesday, etc.)
   * @param schedules - Updated schedules for the day
   */
  async updateDaySchedules(
    userId: string,
    weekStart: string,
    day: keyof WeeklySchedules['schedules'],
    schedules: DailySchedule[],
  ): Promise<void> {
    await this.client
      .update({
        TableName: this.tableName,
        Key: {
          userId,
          weekStart,
        },
        UpdateExpression: 'SET schedules.#day = :schedules',
        ExpressionAttributeNames: {
          '#day': day,
        },
        ExpressionAttributeValues: {
          ':schedules': schedules,
        },
      })
      .promise();
  }

  /**
   * Put an item into DynamoDB
   */
  async putItem(
    params: DynamoDB.DocumentClient.PutItemInput,
  ): Promise<DynamoDB.DocumentClient.PutItemOutput> {
    return this.client.put(params).promise();
  }

  /**
   * Quick update for schedule position/time
   * @remarks Used for drag-drop operations
   */
  async updateSchedulePosition(
    userId: string,
    weekStart: string,
    day: keyof WeeklySchedules['schedules'],
    scheduleId: string,
    updates: {
      startTime: string;
      endTime: string;
      order: number;
    },
  ): Promise<void> {
    const schedules = await this.getWeeklySchedules(userId, weekStart);
    if (!schedules) return;

    // Update the specific schedule
    const daySchedules = schedules.schedules[day];
    const scheduleIndex = daySchedules.findIndex((s) => s.id === scheduleId);

    if (scheduleIndex >= 0) {
      daySchedules[scheduleIndex] = {
        ...daySchedules[scheduleIndex],
        ...updates,
      };

      // Reorder if needed
      daySchedules.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      await this.updateDaySchedules(userId, weekStart, day, daySchedules);
    }
  }

  /**
   * Add schedule from inbox to calendar
   * @remarks Used when dragging from inbox to calendar
   */
  async addScheduleToDay(
    userId: string,
    weekStart: string,
    day: keyof WeeklySchedules['schedules'],
    schedule: DailySchedule,
  ): Promise<void> {
    const schedules = await this.getWeeklySchedules(userId, weekStart);
    if (!schedules) {
      // Create new week entry
      await this.updateWeeklySchedules({
        userId,
        weekStart,
        schedules: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          [day]: [schedule],
        },
      });
      return;
    }

    // Add to existing day and sort
    const daySchedules = [...schedules.schedules[day], schedule];
    daySchedules.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    await this.updateDaySchedules(userId, weekStart, day, daySchedules);
  }

  /**
   * Batch write items to DynamoDB
   * @remarks Automatically handles chunking into 25 items per request (DynamoDB limit)
   */
  async batchWriteItems(tableName: string, items: Record<string, any>[]) {
    // DynamoDB can only process 25 items per batch
    const BATCH_SIZE = 25;
    const chunks = [];

    // Split items into chunks of 25
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      chunks.push(items.slice(i, i + BATCH_SIZE));
    }

    // Process each chunk
    await Promise.all(
      chunks.map(async (chunk) => {
        const params: DynamoDB.DocumentClient.BatchWriteItemInput = {
          RequestItems: {
            [tableName]: chunk.map((item) => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        };

        await this.client.batchWrite(params).promise();
      }),
    );
  }

  /**
   * Query operations for a specific block
   * @remarks Used for conflict resolution in collaborative editing
   */
  async queryBlockOperations(noteId: string, blockId: string, limit = 1) {
    const result = await this.client
      .query({
        TableName: 'NoteOperations',
        KeyConditionExpression: 'noteId = :noteId AND blockId = :blockId',
        ExpressionAttributeValues: {
          ':noteId': noteId,
          ':blockId': blockId,
        },
        ScanIndexForward: false, // Get most recent first
        Limit: limit,
      })
      .promise();

    return result.Items;
  }

  /**
   * Batch delete items from DynamoDB
   * @remarks Automatically handles chunking into 25 items per request (DynamoDB limit)
   */
  async batchDeleteItems(
    tableName: string,
    keys: { noteId: string; blockId: string }[],
  ) {
    // DynamoDB can only process 25 items per batch
    const BATCH_SIZE = 25;

    // Process in chunks
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE).map((key) => ({
        DeleteRequest: {
          Key: key,
        },
      }));

      await this.client
        .batchWrite({
          RequestItems: {
            [tableName]: batch,
          },
        })
        .promise();
    }
  }

  /**
   * Check if DynamoDB is healthy by attempting a simple operation
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client
        .scan({ TableName: 'WeeklySchedules', Limit: 1 })
        .promise();
      return true;
    } catch (error) {
      return false;
    }
  }
}
