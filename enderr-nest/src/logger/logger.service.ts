import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LogContext {
  context?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Custom logger service with structured logging
 * @remarks Extends NestJS Logger with additional context and formatting
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  private context?: string;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Set logger context
   * @param context Name of the context (usually class or module name)
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Format log message with context
   * @param message Log message
   * @param context Additional context
   */
  private formatMessage(message: any, context?: LogContext) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      message,
      context: context?.context || this.context,
      environment: this.configService.get<string>('NODE_ENV'),
      ...context,
    };
  }

  /**
   * Log information
   * @param message Log message
   * @param context Additional context
   */
  log(message: any, context?: LogContext) {
    const formattedMessage = this.formatMessage(message, context);
    console.log(JSON.stringify(formattedMessage));
  }

  /**
   * Log error
   * @param message Error message
   * @param trace Error stack trace
   * @param context Additional context
   */
  error(message: any, trace?: string, context?: LogContext) {
    const formattedMessage = this.formatMessage(message, {
      ...context,
      trace,
      level: 'error',
    });
    console.error(JSON.stringify(formattedMessage));
  }

  /**
   * Log warning
   * @param message Warning message
   * @param context Additional context
   */
  warn(message: any, context?: LogContext) {
    const formattedMessage = this.formatMessage(message, {
      ...context,
      level: 'warn',
    });
    console.warn(JSON.stringify(formattedMessage));
  }

  /**
   * Log debug information
   * @param message Debug message
   * @param context Additional context
   */
  debug(message: any, context?: LogContext) {
    // Only log debug in development
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      const formattedMessage = this.formatMessage(message, {
        ...context,
        level: 'debug',
      });
      console.debug(JSON.stringify(formattedMessage));
    }
  }

  /**
   * Log verbose information
   * @param message Verbose message
   * @param context Additional context
   */
  verbose(message: any, context?: LogContext) {
    // Only log verbose in development
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      const formattedMessage = this.formatMessage(message, {
        ...context,
        level: 'verbose',
      });
      console.log(JSON.stringify(formattedMessage));
    }
  }
}
