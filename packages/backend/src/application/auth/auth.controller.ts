import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Inject,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDTO, LoginDTO, User } from '@meetwithfriends/shared';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(USER_REPOSITORY)
    private userRepository: UserRepository,
  ) {}

  @Post('register')
  async register(@Body() input: RegisterDTO.Request): Promise<RegisterDTO.Response> {
    return this.authService.register(input);
  }

  @Post('login')
  async login(@Body() input: LoginDTO.Request): Promise<LoginDTO.Response> {
    return this.authService.login(input);
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
  logout(): { message: string } {
    // TODO: Invalidar sesión/token si es necesario
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
}
