import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SkillEvaluationDto } from './create-interview-evaluation.dto';

export class SubmitTechLeadEvaluationDto {
  @IsNotEmpty({ message: 'Interview comments and notes are required' })
  @IsString({ message: 'notes must be a string' })
  notes: string;

  @IsNotEmpty({ message: 'Technical skill evaluation scores are required' })
  @IsArray({ message: 'skills must be an array' })
  @ValidateNested({ each: true })
  @Type(() => SkillEvaluationDto)
  skills: SkillEvaluationDto[];
}
