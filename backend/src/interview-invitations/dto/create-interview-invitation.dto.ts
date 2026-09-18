import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateInterviewInvitationDto {
  @IsNotEmpty({ message: 'candidate_id is required' })
  @IsInt({ message: 'candidate_id must be an integer' })
  @IsPositive({ message: 'candidate_id must be a positive integer' })
  candidate_id: number;
}
