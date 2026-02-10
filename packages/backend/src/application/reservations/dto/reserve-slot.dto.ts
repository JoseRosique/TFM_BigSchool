import { IsUUID } from 'class-validator';

export class ReserveSlotDto {
  @IsUUID()
  slotId!: string;
}
