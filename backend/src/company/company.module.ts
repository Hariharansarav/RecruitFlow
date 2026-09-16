import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Job } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { CandidatesModule } from '../candidates/candidates.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate, Job, User, InterviewEvaluation]),
    CandidatesModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
