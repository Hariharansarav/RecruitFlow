import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

export class UpdateJobDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  department?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Required skills must be a string' })
  required_skills?: string;

  @IsOptional()
  @IsString({ message: 'Experience required must be a string' })
  experience_required?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  location?: string;

  @IsOptional()
  @IsEnum(JobStatus, { message: 'Status must be either OPEN or CLOSED' })
  status?: JobStatus;
}
