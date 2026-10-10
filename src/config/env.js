const { z } = require('zod');

/**
 * Strict Zod schema for validating required environment variables at startup
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required in .env file'),
  JWT_SECRET: z.string().min(6, 'JWT_SECRET must be at least 6 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
});

const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment configuration error:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid environment configuration. Please check your .env file.');
  }
  return result.data;
};

module.exports = validateEnv;
