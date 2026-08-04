import pino from 'pino';
import { config } from './config.js';

const isDev = ['development', 'test'].includes(config.NODE_ENV);

export const logger = pino({
  level: config.LOG_LEVEL,

  // REMOVE SENSITIVE DATA
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.confirmPassword',
      'body.token',
      'body.refreshToken',
      'body.accessToken',
      'cookies.refreshToken',
      'refreshToken',
      'accessToken',
    ],
    censor: '[REDACTED]',
  },

  //  CLEAN STRUCTURED OUTPUT

  base: {
    service: 'temple-backend',
    env: config.NODE_ENV,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
    err(err) {
      return {
        message: err.message,
        stack: err.stack,
        type: err.name,
      };
    },
  },

  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
