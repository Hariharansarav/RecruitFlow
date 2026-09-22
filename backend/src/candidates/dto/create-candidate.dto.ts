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

  @IsNotEmpty({ message: 'Resume document or URL is required' })
  @IsString({ message: 'resume_url must be a string' })
  resume_url: string;

  @IsOptional()
  @IsString()
  resume_text?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsNotEmpty({ message: 'job_id is required' })
  @IsInt({ message: 'job_id must be an integer' })
  @IsPositive({ message: 'job_id must be a positive integer' })
  job_id: number;


  @IsOptional()
  @IsString()
  interviewer_email?: string;

  @IsOptional()
  @IsString()
  interview_date?: string;

  @IsOptional()
  @IsString()
  interview_time?: string;

  @IsOptional()
  @IsString()
  gmeet_link?: string;
}
