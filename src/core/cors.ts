import cors from 'cors';
import { env } from './env.js';

const allowedOrigins = new Set(
  [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    console.log('Incoming Origin:', origin);
    console.log('Allowed:', allowedOrigins);

    // Allow non-browser clients (curl, server-to-server) and same-origin
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Requested-With',
  ],
});
