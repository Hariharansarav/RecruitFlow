import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SkillEvaluationDto {
  @IsNotEmpty({ message: 'skill name is required' })
  @IsString({ message: 'skill must be a string' })
  skill: string;

  @IsNotEmpty({ message: 'score is required for skill' })
  @IsNumber({}, { message: 'skill score must be a number' })
  @Min(0, { message: 'skill score must be at least 0' })
  @Max(5, { message: 'skill score must be at most 5' })
  score: number;
}

export class CreateInterviewEvaluationDto {
  @IsNotEmpty({ message: 'candidate_id is required' })
  @IsInt({ message: 'candidate_id must be an integer' })
  @IsPositive({ message: 'candidate_id must be a positive integer' })
  candidate_id: number;

  @IsNotEmpty({ message: 'hr_id is required' })
  @IsInt({ message: 'hr_id must be an integer' })
  @IsPositive({ message: 'hr_id must be a positive integer' })
  hr_id: number;

  @IsOptional()
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  @Max(5, { message: 'score must be at most 5' })
  score?: number;

  @IsNotEmpty({ message: 'notes cannot be empty' })
  @IsString({ message: 'notes must be a string' })
  notes: string;

  @IsOptional()
  @IsArray({ message: 'skills must be an array' })
  @ValidateNested({ each: true })
  @Type(() => SkillEvaluationDto)
  skills?: SkillEvaluationDto[];
}
