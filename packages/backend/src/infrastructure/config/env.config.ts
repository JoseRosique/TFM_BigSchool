import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DB_HOST: z.string().default('postgres'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('meetwithfriends'),

  // Auth
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),
  SESSION_SECRET: z.string(),
  SESSION_TIMEOUT_MS: z.coerce.number().default(3600000),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(10),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(1.0),
});

export type Environment = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Environment {
  return EnvSchema.parse(config);
}
