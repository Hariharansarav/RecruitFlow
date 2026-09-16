import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateInterviewEvaluationDto {
  @IsOptional()
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  @Max(5, { message: 'score must be at most 5' })
  score?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'notes cannot be empty' })
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}
