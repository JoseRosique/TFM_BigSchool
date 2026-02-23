import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Inject,
  Patch,
  Headers,
  NotFoundException,
  BadRequestException,
  Param,
  ConflictException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDTO,
  LoginDTO,
  User,
  ChangePasswordDTO,
  RefreshTokenDTO,
} from '@meetwithfriends/shared';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ChangePasswordUseCase } from './change-password.usecase';
import { PasswordResetService } from './password-reset.service';
import { EmailService } from '../../infrastructure/services/email.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private changePasswordUseCase: ChangePasswordUseCase,
    private passwordResetService: PasswordResetService,
    private emailService: EmailService,
    @Inject(USER_REPOSITORY)
    private userRepository: UserRepository,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('register')
  async register(@Body() input: RegisterDto): Promise<RegisterDTO.Response> {
    return this.authService.register(input);
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('login')
  async login(@Body() input: LoginDto): Promise<LoginDTO.Response> {
    return this.authService.login(input);
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('google')
  async googleLogin(@Body() input: GoogleLoginDto): Promise<LoginDTO.Response> {
    return this.authService.googleLogin(input.credential);
  }

  @Post('refresh')
  async refresh(@Body() input: RefreshTokenDto): Promise<RefreshTokenDTO.Response> {
    return this.authService.refreshAccessToken(input.refreshToken);
  }

  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('forgot-password')
  async forgotPassword(@Body() input: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      console.log('[AuthController] Forgot password request for email:', input.email);
      await this.passwordResetService.requestPasswordReset(input.email);
      console.log('[AuthController] Password reset email sent');
      return { message: 'RESET_EMAIL_SENT' };
    } catch (error) {
      console.error(
        '[AuthController] Error sending password reset email:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  @Get('test-email')
  async testEmail(@Request() req: any): Promise<{ message: string }> {
    const to = req.query?.to;
    if (typeof to !== 'string' || !to.length) {
      throw new BadRequestException('MISSING_EMAIL');
    }
    await this.emailService.sendTestEmail(to);
    return { message: 'TEST_EMAIL_SENT' };
  }

  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('reset-password')
  async resetPassword(@Body() input: ResetPasswordDto): Promise<{ message: string }> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('PASSWORD_MISMATCH');
    }
    await this.passwordResetService.resetPassword(input.token, input.newPassword);
    return { message: 'PASSWORD_RESET_SUCCESS' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get('avatars')
  @UseGuards(JwtAuthGuard)
  getAvailableAvatars(): { avatars: string[] } {
    // 1. Detectamos la ruta de la carpeta 'public/client/assets/avatars'
    // En producción, Nest sirve desde 'public/client'
    const publicPath = path.join(process.cwd(), 'public', 'client', 'assets', 'avatars');

    // 2. Mantenemos una ruta de fallback para local si fuera necesario
    const localPath = path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'avatars');

    // Intentamos primero la de producción, si no, la de local
    const avatarsPath = fs.existsSync(publicPath) ? publicPath : localPath;

    try {
      const files = fs.readdirSync(avatarsPath);
      const avatars = files
        .filter((file) => file.startsWith('avatar-') && /\.(svg|jpg|jpeg|png)$/i.test(file))
        .sort((a, b) => {
          const numA = parseInt(a.match(/avatar-(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/avatar-(\d+)/)?.[1] || '0');
          return numA - numB;
        })
        // La URL pública siempre será /assets/avatars/...
        .map((file) => `/assets/avatars/${file}`);

      return { avatars };
    } catch (error) {
      console.error('Error reading avatars directory:', error);
      return { avatars: [] };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() body: LogoutDto,
  ): Promise<{ message: string }> {
    const accessToken = authHeader?.replace('Bearer ', '');
    await this.authService.logout(accessToken, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Patch('language')
  @UseGuards(JwtAuthGuard)
  async updateLanguage(
    @Request() req: any,
    @Body() dto: UpdateLanguageDto,
  ): Promise<{ language: string }> {
    const user = await this.userRepository.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }
    user.language = dto.language;
    await this.userRepository.save(user);
    return { language: user.language };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Validate nickname uniqueness if being changed
    if (dto.nickname !== undefined && dto.nickname !== user.nickname) {
      const cleanedNickname = dto.nickname.trim().toLowerCase();
      const existingNickname = await this.userRepository.findByNickname(cleanedNickname);
      if (existingNickname) {
        throw new ConflictException('NICKNAME_ALREADY_IN_USE');
      }
      user.nickname = cleanedNickname;
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;
    if (dto.emailNotifications !== undefined) user.emailNotifications = dto.emailNotifications;
    if (dto.pushNotifications !== undefined) user.pushNotifications = dto.pushNotifications;
    if (dto.twoFactorEnabled !== undefined) user.twoFactorEnabled = dto.twoFactorEnabled;
    if (dto.theme !== undefined) user.theme = dto.theme;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordDTO.Response> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('PASSWORD_MISMATCH');
    }
    return this.changePasswordUseCase.execute(req.user.userId, dto);
  }

  @Get('check-nickname/:nickname')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async checkNicknameAvailability(
    @Param('nickname') nickname: string,
  ): Promise<{ available: boolean }> {
    const cleanedNickname = nickname?.trim().toLowerCase();
    if (!cleanedNickname || cleanedNickname.length < 3 || cleanedNickname.length > 20) {
      throw new BadRequestException('INVALID_NICKNAME');
    }
    const existingUser = await this.userRepository.findByNickname(cleanedNickname);
    return { available: !existingUser };
  }
}
