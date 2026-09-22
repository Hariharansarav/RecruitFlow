import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from './entities/candidate.entity';
import { Job } from '../jobs/entities/job.entity';
import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { User } from '../users/entities/user.entity';
import { CandidatesService } from './candidates.service';
import { CandidateMatchingService } from './candidate-matching.service';
import { CandidatesController } from './candidates.controller';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { InterviewInvitationsModule } from '../interview-invitations/interview-invitations.module';
import { AiJobModule } from '../ai-job/ai-job.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate, Job, InterviewEvaluation, User]),
    JobsModule,
    UsersModule,
    InterviewInvitationsModule,
    AiJobModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidateMatchingService],
  exports: [CandidatesService, CandidateMatchingService, TypeOrmModule],
})
export class CandidatesModule {}
