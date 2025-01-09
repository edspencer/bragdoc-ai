import * as winston from 'winston';
import * as path from 'path';
import { getLogsDir } from '../config/paths';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  debug: 'gray',
};

// Add colors to winston
winston.addColors(colors);

// Create format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

//TODO: wtf... this suddenly started to not work.
// const logDir = getLogsDir()

// Create logger
const logger = winston.createLogger({
  levels,
  format,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
    }),
    // // Write all errors to error.log
    // new winston.transports.File({
    //   filename: path.join(logDir, 'error.log'),
    //   level: 'error',
    // }),
    // // Write all logs to combined.log
    // new winston.transports.File({
    //   filename: path.join(logDir, 'combined.log'),
    //   level: 'debug'
    // }),
  ],
});

export default logger;
