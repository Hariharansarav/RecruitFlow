import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterviewInvitationsService } from './interview-invitations.service';
import { CreateInterviewInvitationDto } from './dto/create-interview-invitation.dto';

@Controller('interview-invitations')
export class InterviewInvitationsController {
  constructor(
    private readonly interviewInvitationsService: InterviewInvitationsService,
  ) {}

  /**
   * POST /api/interview-invitations - Create a new invitation or retrieve existing valid pending invitation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrGet(@Body() createDto: CreateInterviewInvitationDto) {
    return this.interviewInvitationsService.createOrGetInvitation(createDto);
  }

  /**
   * GET /api/interview-invitations/candidate/:candidateId - Retrieve latest invitation for a candidate
   */
  @Get('candidate/:candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ) {
    return this.interviewInvitationsService.findByCandidateId(candidateId);
  }

  /**
   * GET /api/interview-invitations/token/:token - Retrieve and validate invitation by token
   */
  @Get('token/:token')
  async findByToken(@Param('token') token: string) {
    return this.interviewInvitationsService.findByToken(token);
  }
}
