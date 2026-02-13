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

  @Post('refresh')
  async refresh(@Body() input: RefreshTokenDto): Promise<RefreshTokenDTO.Response> {
    return this.authService.refreshAccessToken(input.refreshToken);
  }

  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('forgot-password')
  async forgotPassword(@Body() input: ForgotPasswordDto): Promise<{ message: string }> {
    await this.passwordResetService.requestPasswordReset(input.email);
    return { message: 'RESET_EMAIL_SENT' };
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
      throw new NotFoundException('User not found');
    }
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get('avatars')
  @UseGuards(JwtAuthGuard)
  getAvailableAvatars(): { avatars: string[] } {
    // Ruta desde la raíz del monorepo al directorio de avatares
    const workspaceRoot = path.join(process.cwd(), '..');
    const avatarsPath = path.join(workspaceRoot, 'frontend/src/assets/avatars');

    try {
      const files = fs.readdirSync(avatarsPath);
      const avatars = files
        .filter((file) => file.startsWith('avatar-') && /\.(svg|jpg|jpeg|png)$/i.test(file))
        .sort((a, b) => {
          const numA = parseInt(a.match(/avatar-(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/avatar-(\d+)/)?.[1] || '0');
          return numA - numB;
        })
        .map((file) => `/assets/avatars/${file}`);

      return { avatars };
    } catch (error) {
      console.error('Error reading avatars directory:', error);
      console.error('Attempted path:', avatarsPath);
      // Fallback a un arreglo vacío o avatares por defecto
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
      throw new NotFoundException('User not found');
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
      throw new NotFoundException('User not found');
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
}
