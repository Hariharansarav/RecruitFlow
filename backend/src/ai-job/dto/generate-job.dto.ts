import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GenerateJobDto {
  @IsNotEmpty({ message: 'job_title is required' })
  @IsString({ message: 'job_title must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, { message: 'job_title must be at least 2 characters long' })
  @MaxLength(100, { message: 'job_title cannot exceed 100 characters' })
  job_title: string;

  @IsNotEmpty({ message: 'experience_years is required' })
  @Type(() => Number)
  @IsInt({ message: 'experience_years must be an integer' })
  @Min(0, { message: 'experience_years must be greater than or equal to 0' })
  @Max(50, { message: 'experience_years cannot exceed 50' })
  experience_years: number;

  @IsOptional()
  @IsString({ message: 'department must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: 'department cannot exceed 100 characters' })
  department?: string;

  @IsOptional()
  @IsString({ message: 'location must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: 'location cannot exceed 100 characters' })
  location?: string;
}
