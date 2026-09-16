import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class SubmitCandidateDto {
  @IsNotEmpty({ message: 'hr_id is required' })
  @IsInt({ message: 'hr_id must be an integer' })
  @IsPositive({ message: 'hr_id must be a positive integer' })
  hr_id: number;
}
