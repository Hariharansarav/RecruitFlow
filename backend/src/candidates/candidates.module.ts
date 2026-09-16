import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from './entities/candidate.entity';
import { Job } from '../jobs/entities/job.entity';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate, Job]),
    JobsModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService, TypeOrmModule],
})
export class CandidatesModule {}
