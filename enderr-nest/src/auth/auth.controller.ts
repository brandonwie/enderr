import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserFromJwt } from './types/user';
import { PrismaService } from '../prisma.service';

/**
 * DTO for Google Identity Services credential
 * @remarks The credential property is the JWT token from Google
 */
class GoogleCredentialDto {
  @IsString()
  @IsNotEmpty()
  credential: string;
}

/**
 * DTO for refresh token request
 */
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
 * @remarks Handles Google OAuth2 authentication flow and JWT token management
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
   * @returns JWT tokens for authentication
   */
  @Post('google/callback')
  async googleCallback(@Body() dto: GoogleCredentialDto): Promise<JwtTokens> {
    try {
      if (!dto.credential) {
        this.logger.error('No credential provided');
        throw new UnauthorizedException('Credential is required');
      }

      return await this.authService.handleGoogleCallback(dto.credential);
    } catch (error) {
      this.logger.error('Google callback failed', error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param dto Contains refresh token
   * @returns New JWT tokens
   */
  @Post('refresh')
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<JwtTokens> {
    try {
      if (!dto.refresh_token) {
        this.logger.warn('Token refresh attempt without refresh token');
        throw new UnauthorizedException('Refresh token is required');
      }

      return await this.authService.refreshTokens(dto.refresh_token);
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
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
