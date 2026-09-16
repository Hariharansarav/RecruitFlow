import { Controller, Get, Query } from '@nestjs/common';
import { HrService, HrDashboardStats } from './hr.service';

@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  /**
   * GET /hr/dashboard/stats - Retrieve live HR dashboard metrics
   * Query: hr_id (required, must be an HR user)
   */
  @Get('dashboard/stats')
  async getDashboardStats(
    @Query('hr_id') hrId?: string,
  ): Promise<HrDashboardStats> {
    const parsedId = hrId !== undefined ? Number(hrId) : undefined;
    return this.hrService.getDashboardStats(parsedId);
  }
}
