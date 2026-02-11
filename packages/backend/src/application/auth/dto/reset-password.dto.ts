import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
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

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @Match('newPassword')
  confirmPassword!: string;
}
