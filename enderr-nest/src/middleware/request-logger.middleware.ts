import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLogger } from '../logger/logger.service';

/**
 * Middleware to log HTTP requests
 * @remarks Logs request method, path, and timing
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLogger) {
    this.logger.setContext('HTTP');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    // Log request
    this.logger.debug(`Incoming ${method} ${originalUrl}`, {
      userAgent,
      ip: req.ip,
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      if (statusCode >= 400) {
        this.logger.warn(`${method} ${originalUrl} ${statusCode}`, {
          duration,
          userAgent,
          ip: req.ip,
        });
      } else {
        this.logger.debug(`${method} ${originalUrl} ${statusCode}`, {
          duration,
          userAgent,
          ip: req.ip,
        });
      }
    });

    next();
  }
}
