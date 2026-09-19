import {
  Controller,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiJobService } from './ai-job.service';
import { GenerateJobDto } from './dto/generate-job.dto';
import { ParseJdDto } from './dto/parse-jd.dto';
import { StructuredJobApiResponse } from './schemas/job-generation.schema';

@Controller('ai/jobs')
export class AiJobController {
  constructor(private readonly aiJobService: AiJobService) {}

  /**
   * POST /api/ai/jobs/generate
   * Generates a structured Job Description when HR only provides Role + Experience.
   * Does NOT persist the job to the database.
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body() generateJobDto: GenerateJobDto,
    @Query('hr_id') hrId?: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-role') headerUserRole?: string,
  ): Promise<StructuredJobApiResponse> {
    const resolvedHrId = this.resolveUserId(hrId, headerUserId);
    return this.aiJobService.generateJob(
      generateJobDto,
      resolvedHrId,
      headerUserRole,
    );
  }

  /**
   * POST /api/ai/jobs/parse
   * Extracts and structures an existing Job Description from plain text or uploaded file (PDF/DOCX).
   * Does NOT persist the job to the database.
   */
  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async parse(
    @UploadedFile() file?: any,
    @Body() parseJdDto?: ParseJdDto,
    @Query('hr_id') hrId?: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-role') headerUserRole?: string,
  ): Promise<StructuredJobApiResponse> {
    const resolvedHrId = this.resolveUserId(hrId, headerUserId);
    return this.aiJobService.parseJobDescription(
      parseJdDto || {},
      file,
      resolvedHrId,
      headerUserRole,
    );
  }

  /**
   * Resolves the user ID from query parameter or custom header.
   */
  private resolveUserId(
    queryHrId?: string,
    headerUserId?: string,
  ): number | undefined {
    if (queryHrId !== undefined && queryHrId !== null && queryHrId !== '') {
      const parsed = Number(queryHrId);
      if (!isNaN(parsed)) return parsed;
    }
    if (
      headerUserId !== undefined &&
      headerUserId !== null &&
      headerUserId !== ''
    ) {
      const parsed = Number(headerUserId);
      if (!isNaN(parsed)) return parsed;
    }
    return undefined;
  }
}
