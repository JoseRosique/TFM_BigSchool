// Simple Express endpoint for test cleanup (solo para entorno de test)
import { Controller, Post, Body } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('test-utils')
export class TestUtilsController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post('delete-user')
  async deleteUser(@Body('email') email: string) {
    if (!email) return { deleted: false };
    await this.userRepo.delete({ email });
    return { deleted: true };
  }
}
