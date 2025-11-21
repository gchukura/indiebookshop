/**
 * Centralized logging utility
 * 
 * This utility provides a consistent logging interface that can be easily
 * extended to integrate with external logging services (e.g., Sentry, LogRocket).
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Error message', error);
 *   logger.warn('Warning message');
 *   logger.info('Info message'); // Only in development
 *   logger.debug('Debug message'); // Only in development
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log errors - always logged, even in production
   * These should be sent to an error tracking service in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        error,
        message: error.message,
        stack: error.stack,
        ...context,
      });
    } else {
      console.error(`[ERROR] ${message}`, error, context);
    }

    // TODO: In production, send to error tracking service (e.g., Sentry)
    // if (!this.isDevelopment) {
    //   Sentry.captureException(error, { extra: { message, ...context } });
    // }
  }

  /**
   * Log warnings - always logged, even in production
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context);

    // TODO: In production, send to monitoring service if needed
  }

  /**
   * Log informational messages - only in development
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context);
    }
  }

  /**
   * Log debug messages - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Group related log messages (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }
}

export const logger = new Logger();

