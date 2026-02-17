import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Nickname must be at least 3 characters long' })
  @MaxLength(20, { message: 'Nickname must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Nickname can only contain letters, numbers, hyphens, and underscores',
  })
  nickname?: string;

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
