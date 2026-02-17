import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SlotStatus, VisibilityScope } from '@meetwithfriends/shared';

export class UpdateSlotDto {
  @IsISO8601()
  @IsOptional()
  start?: string;

  @IsISO8601()
  @IsOptional()
  end?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(VisibilityScope)
  @IsOptional()
  visibilityScope?: VisibilityScope;

  @IsEnum(SlotStatus)
  @IsOptional()
  status?: SlotStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  groupIds?: string[];
}
