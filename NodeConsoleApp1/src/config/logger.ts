import pino from 'pino';

const pinoConfig = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
    level: process.env.LOG_LEVEL || 'debug',
  },
  production: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

const isDevelopment = process.env.NODE_ENV === 'development';
const config = isDevelopment ? pinoConfig.development : pinoConfig.production;

export const logger = pino(config);
