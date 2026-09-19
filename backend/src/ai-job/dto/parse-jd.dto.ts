import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ParseJdDto {
  @IsOptional()
  @IsString({ message: 'jd_text must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(50000, { message: 'jd_text cannot exceed 50,000 characters' })
  jd_text?: string;
}
