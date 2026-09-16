import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CandidateStatus } from '../enums/candidate-status.enum';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'skills must be a string' })
  skills?: string;

  @IsOptional()
  @IsString({ message: 'resume_url must be a string' })
  resume_url?: string;

  @IsOptional()
  @IsEnum(CandidateStatus, {
    message:
      'Status must be one of APPLIED, EVALUATED, SUBMITTED_TO_COMPANY, ACCEPTED, REJECTED',
  })
  status?: CandidateStatus;
}
