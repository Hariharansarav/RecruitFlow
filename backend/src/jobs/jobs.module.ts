import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { UsersModule } from '../users/users.module';

import { Candidate } from '../candidates/entities/candidate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User, Candidate]),
    UsersModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService, TypeOrmModule],
})
export class JobsModule {}
