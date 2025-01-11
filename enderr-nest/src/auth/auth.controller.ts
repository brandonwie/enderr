import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

class GoogleSignInDto {
  token: string;
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
  constructor(private readonly authService: AuthService) {}

  /**
   * Sign in with Google OAuth token
   * @param dto Contains Google OAuth token from client
   */
  @Post('signin')
  async signInWithGoogle(@Body() dto: GoogleSignInDto): Promise<JwtTokens> {
    if (!dto.token) {
      throw new UnauthorizedException('Token is required');
    }
    return this.authService.signInWithGoogle(dto.token);
  }

  /**
   * Refresh access token using refresh token
   * @param dto Contains refresh token
   */
  @Post('refresh')
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<JwtTokens> {
    if (!dto.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.refreshTokens(dto.refresh_token);
  }
}
