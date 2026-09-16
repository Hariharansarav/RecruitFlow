import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateCandidateDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address format' })
  email: string;

  @IsNotEmpty({ message: 'Phone is required' })
  @IsString({ message: 'Phone must be a string' })
  phone: string;

  @IsNotEmpty({ message: 'Skills are required' })
  @IsString({ message: 'Skills must be a string' })
  skills: string;

  @IsOptional()
  @IsString({ message: 'resume_url must be a string' })
  resume_url?: string;

  @IsNotEmpty({ message: 'job_id is required' })
  @IsInt({ message: 'job_id must be an integer' })
  @IsPositive({ message: 'job_id must be a positive integer' })
  job_id: number;
}
