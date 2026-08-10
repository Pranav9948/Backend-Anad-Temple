/**
 * Safe helper: prints which DB host Prisma would target for an env file.
 * Never prints passwords.
 *
 * Usage:
 *   node scripts/print-db-hosts.mjs
 */
import fs from 'node:fs';

function hostOf(file) {
  try {
    const t = fs.readFileSync(file, 'utf8');
    const pick = (key) => {
      const m = t.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (!m) return null;
      const raw = m[1].trim().replace(/^['"]|['"]$/g, '');
      const url = new URL(raw);
      return `${url.hostname}:${url.port || '5432'}/${url.pathname.replace(/^\//, '') || '(none)'}`;
    };
    return {
      DATABASE_URL: pick('DATABASE_URL') ?? 'NOT_SET',
      DATABASE_DIRECT_URL: pick('DATABASE_DIRECT_URL') ?? 'NOT_SET',
    };
  } catch {
    return { error: 'MISSING_OR_UNREADABLE' };
  }
}

console.log('development (.env.development):', hostOf('.env.development'));
console.log('production  (.env.production):', hostOf('.env.production'));
