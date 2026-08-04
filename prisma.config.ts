import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

function resolveEnvFile(): string {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'test') return '.env.test';
  if (nodeEnv === 'production') return '.env.production';
  return '.env.development';
}

const envFile = resolveEnvFile();
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
} else {
  dotenv.config();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
