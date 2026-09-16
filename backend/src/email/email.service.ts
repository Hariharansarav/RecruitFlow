import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<number>('MAIL_PORT') || 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
    });
  }

  /**
   * Set custom transporter (useful for testing or mock transporters).
   */
  setTransporter(transporter: Transporter) {
    this.transporter = transporter;
  }

  /**
   * Sends a professional rejection email to the candidate.
   *
   * @param candidateName Candidate's full name
   * @param candidateEmail Candidate's email address
   * @param jobTitle Job position title
   * @returns Promise<boolean> true if sent successfully, false on error
   */
  async sendRejectionEmail(
    candidateName: string,
    candidateEmail: string,
    jobTitle: string,
  ): Promise<boolean> {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('MAIL_USER') ||
      'no-reply@recruitflow.com';

    const subject = `Application Update – ${jobTitle}`;
    const text = `Dear ${candidateName},

Thank you for taking the time to participate in the recruitment process for the ${jobTitle} position.

After careful consideration, we regret to inform you that we will not be moving forward with your application for this position.

We appreciate your interest and the time you invested in the process. We wish you the very best in your future career opportunities.

Best regards,
Recruitment Team`;

    try {
      await this.transporter.sendMail({
        from,
        to: candidateEmail,
        subject,
        text,
      });

      this.logger.log(`Rejection email sent to ${candidateEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send rejection email to ${candidateEmail}`);
      return false;
    }
  }
}
