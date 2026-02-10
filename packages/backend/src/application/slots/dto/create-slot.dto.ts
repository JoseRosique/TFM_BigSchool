import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { VisibilityScope } from '@meetwithfriends/shared';

export class CreateSlotDto {
  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsEnum(VisibilityScope)
  visibilityScope!: VisibilityScope;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
