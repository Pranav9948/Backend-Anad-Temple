import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { env } from './env.js';
import { logger } from './logger.js';

function normalizeOrigin(raw: string): string {
  return raw
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');
}

function expandFrontendOrigins(frontendUrl: string): string[] {
  const primary = normalizeOrigin(frontendUrl);
  const origins = new Set<string>([primary]);

  try {
    const url = new URL(primary);
    if (url.hostname.startsWith('www.')) {
      origins.add(`${url.protocol}//${url.hostname.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${url.hostname}`);
    }
  } catch {
    // FRONTEND_URL is Zod-validated as a URL; keep primary only if parsing fails.
  }

  return [...origins];
}

// Single-tenant production site. Always allow both www and apex so a stale
// FRONTEND_URL (e.g. an old Vercel preview host) cannot break browser CORS.
const KNOWN_PRODUCTION_ORIGINS = [
  'https://www.anadchamundidevi.org',
  'https://anadchamundidevi.org',
] as const;

const allowedOrigins = new Set(
  [
    ...expandFrontendOrigins(env.FRONTEND_URL),
    ...KNOWN_PRODUCTION_ORIGINS,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].map(normalizeOrigin),
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser clients (curl/server-to-server) send no Origin.
    if (!origin) {
      return callback(null, true);
    }

    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.has(normalized)) {
      return callback(null, true);
    }

    logger.warn(
      { origin: normalized, allowedOrigins: [...allowedOrigins] },
      'CORS origin rejected',
    );
    return callback(null, false);
  },

  credentials: true,

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Requested-With',
  ],

  optionsSuccessStatus: 204,
};

const corsHandler = cors(corsOptions);

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  corsHandler(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }

    if (req.method === 'OPTIONS' && !res.headersSent) {
      res.sendStatus(204);
      return;
    }

    next();
  });
}
