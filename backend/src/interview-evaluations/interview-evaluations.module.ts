import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewEvaluation } from './entities/interview-evaluation.entity';
import { InterviewEvaluationSkill } from './entities/interview-evaluation-skill.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Job } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { TechLead } from '../tech-leads/entities/tech-lead.entity';
import { InterviewInvitation } from '../interview-invitations/entities/interview-invitation.entity';
import { CandidatesModule } from '../candidates/candidates.module';
import { UsersModule } from '../users/users.module';
import { InterviewEvaluationsController } from './interview-evaluations.controller';
import { InterviewEvaluationsService } from './interview-evaluations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewEvaluation,
      InterviewEvaluationSkill,
      Candidate,
      Job,
      User,
      TechLead,
      InterviewInvitation,
    ]),
    CandidatesModule,
    UsersModule,
  ],
  controllers: [InterviewEvaluationsController],
  providers: [InterviewEvaluationsService],
  exports: [InterviewEvaluationsService, TypeOrmModule],
})
export class InterviewEvaluationsModule {}

