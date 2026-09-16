import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

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
  ) {
    return this.candidatesService.update(id, updateCandidateDto);
  }

  /**
   * DELETE /candidates/:id - Delete candidate by ID
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.remove(id);
  }
}
