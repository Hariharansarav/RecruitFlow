import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateInterviewInvitationDto {
  @IsNotEmpty({ message: 'candidate_id is required' })
  @IsInt({ message: 'candidate_id must be an integer' })
  @IsPositive({ message: 'candidate_id must be a positive integer' })
  candidate_id: number;

  @IsOptional()
  @IsEmail({}, { message: 'interviewer_email must be a valid email address' })
  interviewer_email?: string;

  @IsOptional()
  @IsString()
  interviewer_name?: string;
}
