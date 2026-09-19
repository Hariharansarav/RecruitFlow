import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus } from '../enums/job-status.enum';

export class CreateJobDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsNotEmpty({ message: 'Department is required' })
  @IsString({ message: 'Department must be a string' })
  department: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  description: string;

  @Transform(({ value }) => (Array.isArray(value) ? value.join(', ') : value))
  @IsNotEmpty({ message: 'Required skills are required' })
  @IsString({ message: 'Required skills must be a string' })
  required_skills: string;

  @IsNotEmpty({ message: 'Experience required is required' })
  @IsString({ message: 'Experience required must be a string' })
  experience_required: string;

  @IsNotEmpty({ message: 'Location is required' })
  @IsString({ message: 'Location must be a string' })
  location: string;

  @IsNotEmpty({ message: 'created_by is required' })
  @IsInt({ message: 'created_by must be an integer' })
  @IsPositive({ message: 'created_by must be a positive integer' })
  created_by: number;

  @IsOptional()
  @IsEnum(JobStatus, { message: 'Status must be either OPEN or CLOSED' })
  status?: JobStatus;
}
