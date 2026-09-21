import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { GmailService } from './gmail.service';
import { EmailController } from './email.controller';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailController],
  providers: [EmailService, GmailService, PdfGeneratorService],
  exports: [EmailService, GmailService, PdfGeneratorService],
})
export class EmailModule {}
