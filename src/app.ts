import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import routes from './routes/v1/index.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { NotFoundException } from './exceptions/exceptions.js';
import { ErrorCode } from './exceptions/root.js';
import { prisma } from './infra/db.js';
import { requestContext } from './middlewares/request-context.middleware.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { corsMiddleware } from './core/cors.js';
import { apiLimiter } from './core/rate-limit.js';
import { requestTimeout } from './middlewares/timeout.middleware.js';

export const app: Express = express();

app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    service: 'temple-backend',
    timestamp,
    uptime,
    dependencies: {
      database: dbOk ? 'connected' : 'disconnected',
    },
  });
});

app.disable('x-powered-by');

app.use(corsMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Default helmet CORP is "same-origin", which blocks browsers from reading
    // cross-origin API responses even when Access-Control-Allow-Origin is set.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(requestContext);
app.use(requestLogger);
app.use(requestTimeout(30_000));
app.use('/api', apiLimiter);
app.use('/api/v1', routes);

app.all('{*path}', (req, _res, next) => {
  next(
    new NotFoundException(
      `Route ${req.originalUrl} not found`,
      ErrorCode.NOT_FOUND,
    ),
  );
});

app.use(errorMiddleware);

export default app;
