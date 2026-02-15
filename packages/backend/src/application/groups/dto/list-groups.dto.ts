import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListGroupsQueryDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  search?: string;
}
