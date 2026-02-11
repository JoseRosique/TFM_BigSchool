import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(es|en)$/)
  language?: string;
}
