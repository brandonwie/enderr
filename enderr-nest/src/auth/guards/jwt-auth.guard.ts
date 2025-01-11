import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
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

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.debug('Authenticating request', {
      path: request.path,
      method: request.method,
      cookies: request.cookies,
    });

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn('Authentication failed', { error: err?.message, info });
      throw err || new Error('Unauthorized');
    }
    this.logger.debug('Authentication successful', { userId: user.id });
    return user;
  }
}
