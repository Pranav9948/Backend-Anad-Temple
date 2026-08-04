import app from './app.js';
import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import { connectDB, disConnectDB } from '@/infra/db.js';
import { registerGracefulShutdown } from '@/core/shutdown.js';

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV },
      `Temple backend listening on port ${config.PORT}`,
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
