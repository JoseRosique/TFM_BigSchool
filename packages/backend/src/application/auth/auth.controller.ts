import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDTO, LoginDTO } from '@meetwithfriends/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  getProfile(@Request() req: any) {
    // TODO: Retornar usuario autenticado
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(): { message: string } {
    // TODO: Invalidar sesión/token si es necesario
    return { message: 'Logged out successfully' };
  }
}
