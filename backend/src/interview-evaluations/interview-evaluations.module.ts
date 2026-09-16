import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewEvaluation } from './entities/interview-evaluation.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { User } from '../users/entities/user.entity';
import { CandidatesModule } from '../candidates/candidates.module';
import { UsersModule } from '../users/users.module';
import { InterviewEvaluationsController } from './interview-evaluations.controller';
import { InterviewEvaluationsService } from './interview-evaluations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterviewEvaluation, Candidate, User]),
    CandidatesModule,
    UsersModule,
  ],
  controllers: [InterviewEvaluationsController],
  providers: [InterviewEvaluationsService],
  exports: [InterviewEvaluationsService, TypeOrmModule],
})
export class InterviewEvaluationsModule {}
