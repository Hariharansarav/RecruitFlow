import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SkillEvaluationDto } from './create-interview-evaluation.dto';

export class UpdateInterviewEvaluationDto {
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;

  @IsOptional()
  @IsArray({ message: 'skills must be an array' })
  @ValidateNested({ each: true })
  @Type(() => SkillEvaluationDto)
  skills?: SkillEvaluationDto[];
}
