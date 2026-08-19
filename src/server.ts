import app from './app.js';
import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import {
  connectDB,
  disConnectDB,
  getDatabaseConnectionSummary,
} from '@/infra/db.js';
import { registerGracefulShutdown } from '@/core/shutdown.js';

async function bootstrap(): Promise<void> {
  const db = getDatabaseConnectionSummary();

  logger.info(
    {
      appEnv: config.NODE_ENV,
      port: config.PORT,
      frontendUrl: config.FRONTEND_URL,
      adminJwtExpiresIn: config.ADMIN_JWT_EXPIRES_IN,
      databaseKind: db.inferredKind,
      databaseHost: db.host,
      databaseName: db.database,
      databaseTarget: db.target,
    },
    [
      'Starting temple backend',
      `appEnv=${config.NODE_ENV}`,
      `dbKind=${db.inferredKind}`,
      `db=${db.target}`,
      `adminSession=${config.ADMIN_JWT_EXPIRES_IN}`,
    ].join(' | '),
  );

  await connectDB();

  const server = app.listen(config.PORT, () => {
    const connectedDb = getDatabaseConnectionSummary();
    logger.info(
      {
        port: config.PORT,
        appEnv: config.NODE_ENV,
        databaseKind: connectedDb.inferredKind,
        databaseTarget: connectedDb.target,
        adminJwtExpiresIn: config.ADMIN_JWT_EXPIRES_IN,
      },
      `Temple backend listening on :${config.PORT} | env=${config.NODE_ENV} | db=${connectedDb.inferredKind} (${connectedDb.target}) | admin cookie/JWT TTL=${config.ADMIN_JWT_EXPIRES_IN}`,
    );
  });

  registerGracefulShutdown({
    serviceName: 'temple-backend',
    logger,
    handlers: [
      () =>
        new Promise<void>((resolve, reject) => {
          logger.info('Closing HTTP server...');
          server.close((err?: Error) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }),
      async () => {
        logger.info('Disconnecting from database...');
        await disConnectDB();
      },
    ],
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start temple backend');
  process.exit(1);
});
