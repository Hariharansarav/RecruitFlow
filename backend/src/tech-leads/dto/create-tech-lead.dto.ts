import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTechLeadDto {
  @IsNotEmpty({ message: 'Tech Lead name is required' })
  @IsString({ message: 'Tech Lead name must be a string' })
  @MinLength(2, { message: 'Tech Lead name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Tech Lead name cannot exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsNotEmpty({ message: 'Tech Lead email is required' })
  @IsEmail({}, { message: 'Invalid email address format' })
  @MaxLength(150, { message: 'Email cannot exceed 150 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
