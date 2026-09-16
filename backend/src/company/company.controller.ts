import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyDecisionDto } from './dto/company-decision.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * GET /company/dashboard - Retrieve dashboard overview for company
   */
  @Get('dashboard')
  async getDashboard(@Query('company_id') companyId?: string) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getDashboard(parsedId);
  }

  /**
   * GET /company/candidates/accepted - Retrieve accepted candidates
   * Placed before candidates/:id to prevent route collision
   */
  @Get('candidates/accepted')
  async getAcceptedCandidates(@Query('company_id') companyId?: string) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getAcceptedCandidates(parsedId);
  }

  /**
   * GET /company/candidates/rejected - Retrieve rejected candidates
   * Placed before candidates/:id to prevent route collision
   */
  @Get('candidates/rejected')
  async getRejectedCandidates(@Query('company_id') companyId?: string) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getRejectedCandidates(parsedId);
  }

  /**
   * GET /company/candidates/pending - Retrieve pending candidates awaiting review
   * Placed before candidates/:id to prevent route collision
   */
  @Get('candidates/pending')
  async getPendingCandidates(@Query('company_id') companyId?: string) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getPendingCandidates(parsedId);
  }

  /**
   * GET /company/candidates - Retrieve all reviewable candidates
   */
  @Get('candidates')
  async getSubmittedCandidates(@Query('company_id') companyId?: string) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getSubmittedCandidates(parsedId);
  }

  /**
   * PATCH /company/candidates/:id/decision - Submit ACCEPT or REJECT decision
   */
  @Patch('candidates/:id/decision')
  async makeDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() decisionDto: CompanyDecisionDto,
  ) {
    return this.companyService.makeDecision(id, decisionDto);
  }

  /**
   * GET /company/candidates/:id - Retrieve full review details for a candidate
   */
  @Get('candidates/:id')
  async getSubmittedCandidateById(
    @Param('id', ParseIntPipe) id: number,
    @Query('company_id') companyId?: string,
  ) {
    const parsedId = companyId !== undefined ? Number(companyId) : undefined;
    return this.companyService.getSubmittedCandidateById(id, parsedId);
  }
}
