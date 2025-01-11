import { z } from 'zod';

/**
 * Environment variables validation schema
 * @remarks Using Zod for better TypeScript integration
 */
export const envSchema = z
  .object({
    // Node environment
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    // PostgreSQL
    DATABASE_URL: z.string().min(1),

    // AWS DynamoDB
    AWS_REGION: z.string().min(1),
    // AWS credentials are optional in development/test (for local DynamoDB)
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    DYNAMODB_TABLE_NAME: z.string().min(1),
  })
  .refine(
    (data) => {
      // Require AWS credentials in production
      if (data.NODE_ENV === 'production') {
        return !!data.AWS_ACCESS_KEY_ID && !!data.AWS_SECRET_ACCESS_KEY;
      }
      return true;
    },
    {
      message: 'AWS credentials are required in production environment',
    },
  );

/**
 * Type for validated environment variables
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * @throws {Error} if validation fails
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error.errors);
    process.exit(1);
  }
}
