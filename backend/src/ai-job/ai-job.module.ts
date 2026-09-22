import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AiJobController } from './ai-job.controller';
import { AiJobService } from './ai-job.service';
import { GroqService } from './groq.service';
import { DocumentParserService } from './document-parser.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AiJobController],
  providers: [AiJobService, GroqService, DocumentParserService],
  exports: [AiJobService, GroqService, DocumentParserService],
})
export class AiJobModule {}
