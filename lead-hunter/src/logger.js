import winston from 'winston';

export function createLogger(module) {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) =>
        `[${timestamp}] [${module.toUpperCase()}] ${level}: ${message}`
      )
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'data/lead-hunter.log', maxsize: 5000000, maxFiles: 3 }),
    ],
  });
}
