import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;
}
