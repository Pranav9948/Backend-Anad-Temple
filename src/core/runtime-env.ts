import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z, type ZodType } from 'zod';

export type NodeEnv = 'development' | 'production' | 'test';

export type EnvLoadOptions = Readonly<{
  /**
   * Absolute directory containing the service's env files (e.g. apps/api).
   * This is intentionally explicit because Docker/dev commands may run from repo root.
   */
  serviceRootDir: string;
  nodeEnv?: string | undefined;
}>;

export type EnvValidationOptions = Readonly<{
  serviceName: string;
}>;

export function resolveNodeEnv(nodeEnv: string | undefined): NodeEnv {
  if (
    nodeEnv === 'production' ||
    nodeEnv === 'test' ||
    nodeEnv === 'development'
  ) {
    return nodeEnv;
  }
  return 'development';
}

export function envFilenameFor(nodeEnv: NodeEnv): string {
  if (nodeEnv === 'test') return '.env.test';
  return nodeEnv === 'production' ? '.env.production' : '.env.development';
}

export function loadDotenvOnce(options: EnvLoadOptions): {
  nodeEnv: NodeEnv;
  loadedFrom: string | null;
} {
  const resolvedEnv = resolveNodeEnv(options.nodeEnv);
  const filename = envFilenameFor(resolvedEnv);
  const envPath = path.resolve(options.serviceRootDir, filename);

  // Avoid overriding variables injected by the runtime (Docker/K8s/etc).
  // We still load from file for local/dev parity.
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    return { nodeEnv: resolvedEnv, loadedFrom: envPath };
  }

  // In production, a missing file is usually OK if the orchestrator injects env vars.
  // We defer "required variable" enforcement to schema validation.
  return { nodeEnv: resolvedEnv, loadedFrom: null };
}

export function formatZodEnvError(error: z.ZodError): string {
  const issues = error.issues
    .map((i: z.ZodIssue) => {
      const key = i.path.join('.') || '(root)';
      return `- ${key}: ${i.message}`;
    })
    .join('\n');
  return issues.length > 0 ? issues : error.message;
}

export function validateEnv<TSchema extends ZodType>(
  schema: TSchema,
  env: unknown,
  options: EnvValidationOptions,
): z.infer<TSchema> {
  const parsed = schema.safeParse(env);
  if (parsed.success) return parsed.data;

  // Clean, actionable error. We intentionally crash fast.
  const message =
    `❌ ${options.serviceName} failed to start: invalid environment variables\n` +
    formatZodEnvError(parsed.error);

  // eslint-disable-next-line no-console
  console.error(message);
  throw new Error(message);
}

export function loadAndValidateEnv<TSchema extends ZodType>(
  schema: TSchema,
  options: EnvLoadOptions & EnvValidationOptions,
): { env: z.infer<TSchema>; nodeEnv: NodeEnv; loadedFrom: string | null } {
  const { nodeEnv, loadedFrom } = loadDotenvOnce({
    serviceRootDir: options.serviceRootDir,
    nodeEnv: options.nodeEnv,
  });
  const env = validateEnv(schema, process.env, {
    serviceName: options.serviceName,
  });
  return { env, nodeEnv, loadedFrom };
}
