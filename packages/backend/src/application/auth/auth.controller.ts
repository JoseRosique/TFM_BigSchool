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
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
