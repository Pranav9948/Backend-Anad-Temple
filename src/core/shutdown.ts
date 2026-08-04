export type LoggerLike = Readonly<{
  info: (objOrMsg: unknown, msg?: string) => void;
  warn: (objOrMsg: unknown, msg?: string) => void;
  error: (objOrMsg: unknown, msg?: string) => void;
}>;

export type ShutdownHandler = () => Promise<void> | void;

export type GracefulShutdownOptions = Readonly<{
  serviceName: string;
  logger: LoggerLike;
  handlers: ReadonlyArray<ShutdownHandler>;
}>;

let shutdownStarted = false;

export function registerGracefulShutdown(
  options: GracefulShutdownOptions,
): void {
  const run = async (signal: 'SIGINT' | 'SIGTERM') => {
    if (shutdownStarted) return;
    shutdownStarted = true;

    options.logger.info(
      { signal, service: options.serviceName },
      '🛑 Graceful shutdown started',
    );

    try {
      for (const handler of options.handlers) {
        await handler();
      }
      options.logger.info(
        { signal, service: options.serviceName },
        '✅ Graceful shutdown completed',
      );
      process.exit(0);
    } catch (err) {
      options.logger.error(
        { err, signal, service: options.serviceName },
        '❌ Graceful shutdown failed',
      );
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void run('SIGINT'));
  process.on('SIGTERM', () => void run('SIGTERM'));
}
