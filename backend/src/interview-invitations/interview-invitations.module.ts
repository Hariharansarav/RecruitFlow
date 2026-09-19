import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InterviewInvitation } from './entities/interview-invitation.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { TechLead } from '../tech-leads/entities/tech-lead.entity';
import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { InterviewInvitationsService } from './interview-invitations.service';
import { InterviewInvitationsController } from './interview-invitations.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewInvitation,
      Candidate,
      TechLead,
      InterviewEvaluation,
    ]),
    ConfigModule,
    EmailModule,
  ],
  controllers: [InterviewInvitationsController],
  providers: [InterviewInvitationsService],
  exports: [InterviewInvitationsService, TypeOrmModule],
})
export class InterviewInvitationsModule {}
