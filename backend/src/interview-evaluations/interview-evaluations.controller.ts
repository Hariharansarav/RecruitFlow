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
import { InterviewEvaluationsService } from './interview-evaluations.service';
import { CreateInterviewEvaluationDto } from './dto/create-interview-evaluation.dto';
import { UpdateInterviewEvaluationDto } from './dto/update-interview-evaluation.dto';

@Controller('interview-evaluations')
export class InterviewEvaluationsController {
  constructor(
    private readonly interviewEvaluationsService: InterviewEvaluationsService,
  ) {}

  /**
   * POST /interview-evaluations - Create or update candidate interview evaluation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInterviewEvaluationDto: CreateInterviewEvaluationDto,
  ) {
    return this.interviewEvaluationsService.createOrUpdate(
      createInterviewEvaluationDto,
    );
  }

  /**
   * GET /interview-evaluations - Retrieve all interview evaluations
   */
  @Get()
  async findAll() {
    return this.interviewEvaluationsService.findAll();
  }

  /**
   * GET /interview-evaluations/candidate/:candidateId - Retrieve evaluation for candidate
   * Registered ahead of :id to prevent route collision
   */
  @Get('candidate/:candidateId')
  async findByCandidateId(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ) {
    return this.interviewEvaluationsService.findByCandidateId(candidateId);
  }

  /**
   * GET /interview-evaluations/:id - Retrieve evaluation by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.interviewEvaluationsService.findOne(id);
  }

  /**
   * PUT /interview-evaluations/:id - Update evaluation score/notes
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInterviewEvaluationDto: UpdateInterviewEvaluationDto,
  ) {
    return this.interviewEvaluationsService.update(
      id,
      updateInterviewEvaluationDto,
    );
  }

  /**
   * DELETE /interview-evaluations/:id - Delete evaluation by ID
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.interviewEvaluationsService.remove(id);
  }
}
