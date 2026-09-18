import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TechLeadStatus } from '../enums/tech-lead-status.enum';

export class UpdateTechLeadDto {
  @IsOptional()
  @IsString({ message: 'Tech Lead name must be a string' })
  @MinLength(2, { message: 'Tech Lead name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Tech Lead name cannot exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format' })
  @MaxLength(150, { message: 'Email cannot exceed 150 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsEnum(TechLeadStatus, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  status?: TechLeadStatus;
}
