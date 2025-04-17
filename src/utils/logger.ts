import winston from 'winston';

/**
 * Custom logger for the trading system
 * Configurable log levels and transport options
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gridbot-trading-system' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ filename: 'logs/combined.log' }),
    
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Create a stream object with a 'write' function that will be used by morgan
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;
