import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateInterviewEvaluationDto {
  @IsNotEmpty({ message: 'candidate_id is required' })
  @IsInt({ message: 'candidate_id must be an integer' })
  @IsPositive({ message: 'candidate_id must be a positive integer' })
  candidate_id: number;

  @IsNotEmpty({ message: 'hr_id is required' })
  @IsInt({ message: 'hr_id must be an integer' })
  @IsPositive({ message: 'hr_id must be a positive integer' })
  hr_id: number;

  @IsNotEmpty({ message: 'score is required' })
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  @Max(5, { message: 'score must be at most 5' })
  score: number;

  @IsNotEmpty({ message: 'notes cannot be empty' })
  @IsString({ message: 'notes must be a string' })
  notes: string;
}
