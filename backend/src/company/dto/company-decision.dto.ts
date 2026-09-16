import { IsEnum, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export enum CompanyDecision {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class CompanyDecisionDto {
  @IsNotEmpty({ message: 'company_id is required' })
  @IsInt({ message: 'company_id must be an integer' })
  @IsPositive({ message: 'company_id must be a positive integer' })
  company_id: number;

  @IsNotEmpty({ message: 'decision is required' })
  @IsEnum(CompanyDecision, {
    message: 'decision must be either ACCEPT or REJECT',
  })
  decision: CompanyDecision;
}
