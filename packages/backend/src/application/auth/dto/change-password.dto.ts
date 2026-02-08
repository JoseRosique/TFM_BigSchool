import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          return value === relatedValue;
        },
      },
    });
  };
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'PASSWORD_REQUIRED' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_WEAK' })
  @MaxLength(64, { message: 'PASSWORD_WEAK' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/, {
    message: 'PASSWORD_WEAK',
  })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'PASSWORD_REQUIRED' })
  @Match('newPassword', { message: 'PASSWORD_MISMATCH' })
  confirmPassword!: string;
}
