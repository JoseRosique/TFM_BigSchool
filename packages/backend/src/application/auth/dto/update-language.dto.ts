import { IsNotEmpty, IsIn } from 'class-validator';

const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

export class UpdateLanguageDto {
  @IsNotEmpty()
  @IsIn(SUPPORTED_LANGUAGES, {
    message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  })
  language!: string;
}
