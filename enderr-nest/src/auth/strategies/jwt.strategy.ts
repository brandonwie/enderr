import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { CustomLogger } from '../../logger/logger.service';
import { UserFromJwt } from '../types/user';

interface JwtPayload {
  sub: string;
}

/**
 * JWT Strategy for Passport
 * @remarks Extracts and validates JWT tokens from Authorization Bearer header
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new CustomLogger(this.configService);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
    this.logger.setContext('JwtStrategy');
  }

  /**
   * Validate JWT payload and return user
   * @param payload JWT payload with user ID
   * @remarks Called by Passport after token verification
   */
  async validate(payload: JwtPayload): Promise<UserFromJwt> {
    this.logger.debug('Validating JWT payload', { payload });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
      },
    });

    if (!user) {
      this.logger.warn('User not found for JWT payload', { payload });
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug('JWT validation successful', { userId: user.id });
    return user;
  }
}
