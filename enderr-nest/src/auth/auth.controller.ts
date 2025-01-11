import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

class GoogleSignInDto {
  google_token: string;
}

class RefreshTokenDto {
  refresh_token: string;
}

interface JwtTokens {
  access_token: string;
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
    if (!dto.google_token) {
      throw new UnauthorizedException('Token is required');
    }

    const tokens = await this.authService.signInWithGoogle(dto.google_token);

    // Set secure HTTP-only cookies
    this.setAuthCookies(res, tokens);

    return { success: true };
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
    if (!dto.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens = await this.authService.refreshTokens(dto.refresh_token);

    // Set secure HTTP-only cookies
    this.setAuthCookies(res, tokens);

    return { success: true };
  }

  /**
   * Set authentication cookies
   * @param res Express response object
   * @param tokens JWT tokens to set as cookies
   */
  private setAuthCookies(res: Response, tokens: JwtTokens): void {
    const isDev = this.configService.get('NODE_ENV') === 'development';

    // Set access token cookie
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: !isDev, // Only use HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: !isDev, // Only use HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
