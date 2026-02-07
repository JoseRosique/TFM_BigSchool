import { IsString, IsOptional, IsEmail, IsBoolean, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  @IsIn([
    'UTC',
    'America/New_York',
    'Europe/London',
    'Europe/Madrid',
    'Asia/Tokyo',
    'Australia/Sydney',
  ])
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  twoFactorEnabled?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
