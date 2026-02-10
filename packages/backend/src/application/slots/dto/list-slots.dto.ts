import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { SlotStatus } from '@meetwithfriends/shared';

export class ListSlotsQueryDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEnum(SlotStatus)
  @IsOptional()
  status?: SlotStatus;

  @IsISO8601()
  @IsOptional()
  from?: string;

  @IsISO8601()
  @IsOptional()
  to?: string;
}
