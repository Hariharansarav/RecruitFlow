import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { GmailService, EmailAttachment } from './gmail.service';

export interface SendInterviewInvitationParams {
  techLeadName: string;
  techLeadEmail: string;
  candidateName: string;
  jobTitle: string;
  evaluationLink: string;
  expiresAt: Date | string;
  jdSummary?: string;
  jobDepartment?: string;
  jobLocation?: string;
  jobExperience?: string;
  requiredSkills?: string;
  attachments?: EmailAttachment[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly gmailService: GmailService,
  ) {
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
   * Sends an interview invitation email to the assigned Tech Lead via the Gmail API,
   * containing the Job Description summary and attached JD PDF + Candidate Resume.
   *
   * @param params Interview invitation details
   * @returns Promise<{ success: boolean, messageId?: string }>
   */
  async sendInterviewInvitationEmail(
    params: SendInterviewInvitationParams,
  ): Promise<{ success: boolean; messageId?: string }> {
    const {
      techLeadName,
      techLeadEmail,
      candidateName,
      jobTitle,
      evaluationLink,
      expiresAt,
      jdSummary,
      jobDepartment,
      jobLocation,
      jobExperience,
      requiredSkills,
      attachments,
    } = params;

    const formattedDate = new Date(expiresAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const subject = `Technical Interview Evaluation – ${candidateName}`;

    // Build the Job Description Summary section
    let summarySection = '';
    if (jdSummary || requiredSkills) {
      const metaLine = [
        jobDepartment ? `Department: ${jobDepartment}` : null,
        jobExperience ? `Experience: ${jobExperience}` : null,
        jobLocation ? `Location: ${jobLocation}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      summarySection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOB DESCRIPTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position: ${jobTitle}${metaLine ? ` (${metaLine})` : ''}

Role Overview:
${jdSummary || 'Please refer to the attached Job Specification for detailed responsibilities.'}
${
  requiredSkills
    ? `
Key Competencies to Assess:
${requiredSkills}`
    : ''
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    // Build attachments note
    let attachmentsNote = '';
    if (attachments && attachments.length > 0) {
      const fileList = attachments
        .map((att) => `• 📎 ${att.filename}`)
        .join('\n');
      attachmentsNote = `
Attached Documents:
${fileList}
`;
    }

    const body = `Hello ${techLeadName},

You have been assigned to conduct the technical evaluation
for the following candidate.

Candidate:
${candidateName}

Position:
${jobTitle}
${summarySection}
Please use the secure link below to access the technical evaluation:

${evaluationLink}

This evaluation link is valid until:

${formattedDate}

Please complete the evaluation by rating the required technical
skills and adding your interview comments.

You do not need to create an account or log in.
${attachmentsNote}
Regards,
Recruitment Team`;

    this.logger.log(
      `Dispatching interview invitation via Gmail API to ${techLeadEmail}${attachments?.length ? ` with ${attachments.length} attachment(s)` : ''}`,
    );
    return this.gmailService.sendEmail(
      techLeadEmail,
      subject,
      body,
      attachments,
    );
  }

  /**
   * Sends a verification test email via the Gmail API.
   */
  async sendTestEmail(
    to: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const subject = 'RecruitFlow Gmail Integration Test';
    const body = `Hello,

This is a test email sent from RecruitFlow using Google OAuth2 and the Gmail API.

If you received this email, your Gmail integration is functioning properly!

Timestamp: ${new Date().toISOString()}

Regards,
RecruitFlow Team`;

    this.logger.log(`Dispatching test email via Gmail API to ${to}`);
    return this.gmailService.sendEmail(to, subject, body);
  }

  /**
   * Sends a professional rejection email to the candidate via Nodemailer.
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
