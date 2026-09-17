import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { SubmitCandidateDto } from './dto/submit-candidate.dto';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  /**
   * POST /candidates - Create a new candidate for an OPEN job
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCandidateDto: CreateCandidateDto) {
    return this.candidatesService.create(createCandidateDto);
  }

  /**
   * GET /candidates - Retrieve all candidates
   */
  @Get()
  async findAll() {
    return this.candidatesService.findAll();
  }

  /**
   * GET /candidates/job/:jobId - Retrieve all candidates for a specific job
   */
  @Get('job/:jobId')
  async findByJob(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.candidatesService.findByJob(jobId);
  }

  /**
   * GET /candidates/:id/match - Retrieve skills matching calculation
   */
  @Get(':id/match')
  async getMatch(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.getMatch(id);
  }

  /**
   * GET /candidates/:id/screening - Retrieve candidate screening summary
   */
  @Get(':id/screening')
  async getScreening(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.getScreening(id);
  }

  /**
   * GET /candidates/submitted - Retrieve all submitted candidates
   * Placed before :id to prevent route collision
   */
  @Get('submitted')
  async findSubmitted() {
    return this.candidatesService.findSubmittedCandidates();
  }

  /**
   * GET /candidates/submitted/:id - Retrieve single submitted candidate details
   * Placed before :id to prevent route collision
   */
  @Get('submitted/:id')
  async findSubmittedOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.findSubmittedCandidateById(id);
  }

  /**
   * POST /candidates/:id/submit - Submit evaluated candidate to company
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitCandidateDto: SubmitCandidateDto,
  ) {
    return this.candidatesService.submitCandidate(id, submitCandidateDto);
  }

  /**
   * GET /candidates/with-screening - Retrieve all candidates with pre-calculated JD match
   * Placed before :id to prevent route collision
   */
  @Get('with-screening')
  async findWithScreening() {
    return this.candidatesService.findAllWithScreening();
  }

  /**
   * GET /candidates/:id - Retrieve a single candidate by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.findOne(id);
  }

  /**
   * PUT /candidates/:id - Update candidate details / status
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCandidateDto: UpdateCandidateDto,
    @Query('hr_id') hrId?: string,
  ) {
    const parsedHrId = hrId !== undefined ? Number(hrId) : undefined;
    return this.candidatesService.update(id, updateCandidateDto, parsedHrId);
  }

  /**
   * DELETE /candidates/:id - Delete candidate by ID
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('hr_id') hrId?: string,
  ) {
    const parsedHrId = hrId !== undefined ? Number(hrId) : undefined;
    return this.candidatesService.remove(id, parsedHrId);
  }
}
