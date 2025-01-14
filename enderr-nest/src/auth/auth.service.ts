import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma.service';
import { CustomLogger } from '../logger/logger.service';

interface GoogleTokenPayload {
  email: string;
  name: string;
  picture: string;
}

interface JwtTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: CustomLogger,
  ) {
    this.googleClient = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });
    this.logger.setContext(AuthService.name);
  }

  /**
   * Verify Google OAuth token and sign in or sign up user
   * @param token Google OAuth token from client
   */
  async signInWithGoogle(token: string): Promise<JwtTokens> {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload() as GoogleTokenPayload;
      if (!payload) {
        this.logger.error('Invalid token payload', null, { token });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Find or create user
      const user = await this.findOrCreateUser(payload);
      this.logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
      });

      // Generate tokens
      return this.generateTokens(user.id);
    } catch (error) {
      this.logger.error('Google authentication failed', error.stack, { token });
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Generate new access token using refresh token
   * @param refreshToken Current refresh token
   */
  async refreshTokens(refreshToken: string): Promise<JwtTokens> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn('Refresh token for non-existent user', {
          userId: payload.sub,
        });
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug('Tokens refreshed', { userId: user.id });
      // Generate new tokens
      return this.generateTokens(user.id);
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Find existing user or create new one
   * @param payload Google token payload
   */
  private async findOrCreateUser(payload: GoogleTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      this.logger.debug('Existing user found', {
        userId: user.id,
        email: user.email,
      });
      return user;
    }

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
    });

    this.logger.log('New user created', {
      userId: newUser.id,
      email: newUser.email,
    });
    return newUser;
  }

  /**
   * Handle Google Identity Services callback
   * @param credential JWT credential from Google Identity Services
   */
  async handleGoogleCallback(credential: string): Promise<JwtTokens> {
    try {
      // Verify the credential token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.name) {
        this.logger.error('Invalid token payload', null, { payload });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Extract user information from payload
      const userInfo: GoogleTokenPayload = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture || '', // Picture might be optional
      };

      // Find or create user
      const user = await this.findOrCreateUser(userInfo);
      this.logger.debug('User authenticated via callback', {
        userId: user.id,
        email: user.email,
      });

      // Generate tokens
      return this.generateTokens(user.id);
    } catch (error) {
      this.logger.error('Google callback authentication failed', error.stack, {
        error: error.message,
      });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Generate access and refresh tokens
   * @param userId User ID for token payload
   */
  private generateTokens(userId: string): JwtTokens {
    const payload = { sub: userId };
    const SEVEN_DAYS = '7d';

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: SEVEN_DAYS,
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
        expiresIn: SEVEN_DAYS,
      }),
    };
  }
}
