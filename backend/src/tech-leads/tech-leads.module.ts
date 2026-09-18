import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechLead } from './entities/tech-lead.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { TechLeadsService } from './tech-leads.service';
import { TechLeadsController } from './tech-leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TechLead, Candidate])],
  controllers: [TechLeadsController],
  providers: [TechLeadsService],
  exports: [TechLeadsService, TypeOrmModule],
})
export class TechLeadsModule {}
