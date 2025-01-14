import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from '../../logger/logger.service';

/**
 * JWT Authentication Guard
 * @remarks Uses Passport JWT strategy to validate tokens
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new CustomLogger(this.configService);

  constructor(private readonly configService: ConfigService) {
    super();
    this.logger.setContext('JwtAuthGuard');
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    this.logger.debug('Authenticating request', {
      path: request.path,
      method: request.method,
      hasToken: !!token,
    });

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (err || !user) {
      this.logger.warn('Authentication failed', {
        error: err?.message || 'No user found',
        info: info?.message,
        path: request.path,
        hasToken: !!token,
      });

      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      throw new UnauthorizedException(err?.message || 'Unauthorized');
    }

    this.logger.debug('Authentication successful', {
      userId: user.id,
      path: request.path,
    });

    return user;
  }
}
