import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  icon!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  color!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  @IsOptional()
  memberIds?: string[];
}
