import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  Res,
  Logger,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserFromJwt } from './types/user';
import { PrismaService } from '../prisma.service';

class GoogleSignInDto {
  @IsString()
  @IsNotEmpty()
  google_token: string;
}

/**
 * DTO for Google Identity Services credential
 * @remarks The credential property is the JWT token from Google
 */
class GoogleCredentialDto {
  @IsString()
  @IsNotEmpty()
  credential: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

interface JwtTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Authentication Controller
 * @remarks Handles Google OAuth2 authentication flow and token management
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Google Identity Services callback endpoint
   * @param dto Contains the credential JWT from Google
   * @param res Express response object for setting cookies
   */
  @Post('google/callback')
  async googleCallback(
    @Body() dto: GoogleCredentialDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    try {
      if (!dto.credential) {
        this.logger.error('No credential provided');
        throw new UnauthorizedException('Credential is required');
      }

      const tokens = await this.authService.handleGoogleCallback(
        dto.credential,
      );
      this.setAuthCookies(res, tokens);

      return { success: true };
    } catch (error) {
      this.logger.error('Google callback failed', error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Sign in with Google OAuth token
   * @param dto Contains Google OAuth token from client
   * @param res Express response object for setting cookies
   */
  @Post('signin')
  async signInWithGoogle(
    @Body() dto: GoogleSignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    try {
      if (!dto.google_token) {
        this.logger.warn('Sign in attempt without token');
        throw new UnauthorizedException('Token is required');
      }

      const tokens = await this.authService.signInWithGoogle(dto.google_token);
      this.setAuthCookies(res, tokens);

      return { success: true };
    } catch (error) {
      this.logger.error('Sign in failed', error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param dto Contains refresh token from cookie
   * @param res Express response object for setting cookies
   */
  @Post('refresh')
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    try {
      if (!dto.refresh_token) {
        this.logger.warn('Token refresh attempt without refresh token');
        throw new UnauthorizedException('Refresh token is required');
      }

      const tokens = await this.authService.refreshTokens(dto.refresh_token);
      this.setAuthCookies(res, tokens);

      return { success: true };
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Sign out user by clearing auth cookies
   * @param res Express response object for clearing cookies
   */
  @Post('signout')
  async signOut(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    try {
      this.clearAuthCookies(res);
      return { success: true };
    } catch (error) {
      this.logger.error('Sign out failed', error.stack);
      throw new InternalServerErrorException('Sign out failed');
    }
  }

  /**
   * Set authentication cookies
   * @param res Express response object
   * @param tokens JWT tokens to set as cookies
   */
  private setAuthCookies(res: Response, tokens: JwtTokens): void {
    const isDev = this.configService.get('NODE_ENV') === 'development';
    const domain = this.configService.get('COOKIE_DOMAIN');

    // Set access token cookie
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Clear authentication cookies
   * @param res Express response object
   */
  private clearAuthCookies(res: Response): void {
    const domain = this.configService.get('COOKIE_DOMAIN');

    res.clearCookie('access_token', {
      path: '/',
      domain,
    });

    res.clearCookie('refresh_token', {
      path: '/',
      domain,
    });
  }

  /**
   * Get current user information
   * @param user User from JWT token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@User() user: UserFromJwt) {
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
        },
      });

      if (!dbUser) {
        throw new UnauthorizedException('User not found');
      }

      return { user: dbUser };
    } catch (error) {
      this.logger.error('Failed to get user info', error.stack);
      throw new UnauthorizedException('Failed to get user info');
    }
  }
}
