import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InterviewInvitation } from './entities/interview-invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import { CreateInterviewInvitationDto } from './dto/create-interview-invitation.dto';
import { Candidate } from '../candidates/entities/candidate.entity';
import { TechLeadStatus } from '../tech-leads/enums/tech-lead-status.enum';

import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { EmailService } from '../email/email.service';
import { PdfGeneratorService } from '../email/pdf-generator.service';
import { EmailAttachment } from '../email/gmail.service';
import { GroqService } from '../ai-job/groq.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InterviewInvitationsService {
  private readonly logger = new Logger(InterviewInvitationsService.name);

  constructor(
    @InjectRepository(InterviewInvitation)
    private readonly invitationRepository: Repository<InterviewInvitation>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly groqService: GroqService,
  ) {}

  /**
   * Constructs the secure evaluation link from configured FRONTEND_URL.
   * Path: /evaluation/{token}
   */
  private getEvaluationLink(token: string): string {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    return `${frontendUrl}/evaluate/${token}`;
  }

  /**
   * Create a new secure interview invitation or return the existing valid pending invitation.
   * Prevents multiple conflicting links and ensures only active Tech Leads receive invitations.
   */
  async createOrGetInvitation(
    createDto: CreateInterviewInvitationDto,
  ): Promise<any> {
    const { candidate_id } = createDto;

    // 1. Find candidate with Job and Tech Lead relations
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidate_id },
      relations: ['job', 'tech_lead'],
    });

    // 2. Verify candidate exists
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidate_id} not found.`);
    }

    // 3. Verify candidate has a Job
    if (!candidate.job) {
      throw new BadRequestException('Candidate has no assigned job.');
    }

    // 4. Verify candidate has an assigned Tech Lead
    if (!candidate.tech_lead_id || !candidate.tech_lead) {
      throw new BadRequestException(
        'Please assign a Tech Lead before sending the interview invitation.',
      );
    }

    // 5. Verify assigned Tech Lead is ACTIVE
    if (candidate.tech_lead.status !== TechLeadStatus.ACTIVE) {
      throw new BadRequestException('Selected Tech Lead is inactive.');
    }

    const now = new Date();

    // 6. Check if an existing PENDING and non-expired invitation exists
    const existingInvitations = await this.invitationRepository.find({
      where: { candidate_id: candidate.id },
      relations: ['tech_lead'],
      order: { created_at: 'DESC' },
    });

    const pendingInvite = existingInvitations.find(
      (inv) => inv.status === InvitationStatus.PENDING,
    );

    if (pendingInvite) {
      // Check if expired
      if (new Date(pendingInvite.expires_at) <= now) {
        pendingInvite.status = InvitationStatus.EXPIRED;
        await this.invitationRepository.save(pendingInvite);
      } else if (pendingInvite.tech_lead_id === candidate.tech_lead.id) {
        // Reuse the existing pending invitation! (Prevents generating duplicate tokens)
        this.logger.log(
          `Reusing existing PENDING invitation ID ${pendingInvite.id} for candidate ${candidate.id}`,
        );

        const evalLink = this.getEvaluationLink(pendingInvite.token);
        return {
          id: pendingInvite.id,
          candidate_id: candidate.id,
          tech_lead_id: candidate.tech_lead.id,
          token: pendingInvite.token,
          tech_lead: {
            id: candidate.tech_lead.id,
            name: candidate.tech_lead.name,
            email: candidate.tech_lead.email,
            status: candidate.tech_lead.status,
          },
          job: {
            id: candidate.job.id,
            title: candidate.job.title,
          },
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
          },
          status: pendingInvite.status,
          expires_at: pendingInvite.expires_at,
          created_at: pendingInvite.created_at,
          evaluation_link: evalLink,
          evaluation_url: evalLink,
        };
      } else {
        // Tech Lead was reassigned, cancel previous pending invite
        pendingInvite.status = InvitationStatus.CANCELLED;
        await this.invitationRepository.save(pendingInvite);
      }
    }

    // 7. Generate secure token using Node.js crypto (64-character unguessable hex)
    const token = crypto.randomBytes(32).toString('hex');

    // 8. Default expiration: 7 days from creation
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 9. Save new invitation
    const newInvitation = this.invitationRepository.create({
      candidate_id: candidate.id,
      candidate,
      tech_lead_id: candidate.tech_lead.id,
      tech_lead: candidate.tech_lead,
      token,
      status: InvitationStatus.PENDING,
      expires_at,
    });

    const saved = await this.invitationRepository.save(newInvitation);

    this.logger.log(
      `Created new interview invitation ID ${saved.id} for candidate ${candidate.id} assigned to Tech Lead ${candidate.tech_lead.name}`,
    );

    const finalToken = saved.token || token;
    const evalLink = this.getEvaluationLink(finalToken);
    return {
      id: saved.id,
      candidate_id: candidate.id,
      tech_lead_id: candidate.tech_lead.id,
      token: finalToken,
      tech_lead: {
        id: candidate.tech_lead.id,
        name: candidate.tech_lead.name,
        email: candidate.tech_lead.email,
        status: candidate.tech_lead.status,
      },
      job: {
        id: candidate.job.id,
        title: candidate.job.title,
      },
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
      },
      status: saved.status,
      expires_at: saved.expires_at,
      created_at: saved.created_at,
      evaluation_link: evalLink,
      evaluation_url: evalLink,
    };
  }

  /**
   * Retrieve the latest invitation for a given candidate.
   */
  async findByCandidateId(candidateId: number): Promise<any | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { candidate_id: candidateId },
      relations: ['candidate', 'candidate.job', 'tech_lead'],
      order: { created_at: 'DESC' },
    });

    if (!invitation) {
      return null;
    }

    // Check expiration if still pending
    if (
      invitation.status === InvitationStatus.PENDING &&
      new Date(invitation.expires_at) <= new Date()
    ) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
    }

    const evalLink = this.getEvaluationLink(invitation.token);
    return {
      id: invitation.id,
      candidate_id: invitation.candidate_id,
      tech_lead_id: invitation.tech_lead_id,
      token: invitation.token,
      tech_lead: invitation.tech_lead
        ? {
            id: invitation.tech_lead.id,
            name: invitation.tech_lead.name,
            email: invitation.tech_lead.email,
            status: invitation.tech_lead.status,
          }
        : null,
      job: invitation.candidate?.job
        ? {
            id: invitation.candidate.job.id,
            title: invitation.candidate.job.title,
          }
        : null,
      candidate: invitation.candidate
        ? {
            id: invitation.candidate.id,
            name: invitation.candidate.name,
            email: invitation.candidate.email,
            phone: invitation.candidate.phone,
            resume_url: invitation.candidate.resume_url,
          }
        : null,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      completed_at: invitation.completed_at,
      evaluation_link: evalLink,
      evaluation_url: evalLink,
    };
  }

  /**
   * Find and validate invitation by token (used for verification and Phase 22).
   */
  async findByToken(token: string): Promise<any> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['candidate', 'candidate.job', 'tech_lead'],
    });

    if (!invitation) {
      throw new NotFoundException('Interview invitation not found or link is invalid.');
    }

    // Check expiration
    if (
      invitation.status === InvitationStatus.PENDING &&
      new Date(invitation.expires_at) <= new Date()
    ) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
    }

    const evalLink = this.getEvaluationLink(invitation.token);
    const isValid =
      invitation.status === InvitationStatus.PENDING &&
      new Date(invitation.expires_at) > new Date();

    const jobDetails = invitation.candidate?.job
      ? {
          id: invitation.candidate.job.id,
          title: invitation.candidate.job.title,
          required_skills: invitation.candidate.job.required_skills,
        }
      : null;

    // If completed or evaluation already exists, fetch evaluation and skills
    let evaluationData: any = null;
    if (invitation.status === InvitationStatus.COMPLETED || invitation.completed_at) {
      const existingEval = await this.evaluationRepository.findOne({
        where: { candidate_id: invitation.candidate_id },
        relations: ['skills', 'tech_lead'],
      });
      if (existingEval) {
        evaluationData = {
          id: existingEval.id,
          score: existingEval.score,
          overall_score: existingEval.score,
          jd_match_percentage: existingEval.jd_match_percentage,
          notes: existingEval.notes,
          skills: (existingEval.skills || []).map((s) => ({
            id: s.id,
            skill: s.skill,
            score: Number(s.score),
          })),
          submitted_at: invitation.completed_at || existingEval.updated_at,
        };
      }
    }

    return {
      id: invitation.id,
      evaluation_id: evaluationData?.id || null,
      candidate_id: invitation.candidate_id,
      job_id: jobDetails?.id || null,
      tech_lead_id: invitation.tech_lead_id,
      tech_lead_email: invitation.tech_lead?.email || null,
      token: invitation.token,
      secure_token: invitation.token,
      is_valid: isValid,
      tech_lead: invitation.tech_lead
        ? {
            id: invitation.tech_lead.id,
            name: invitation.tech_lead.name,
            email: invitation.tech_lead.email,
            status: invitation.tech_lead.status,
          }
        : null,
      job: jobDetails,
      candidate: invitation.candidate
        ? {
            id: invitation.candidate.id,
            name: invitation.candidate.name,
            email: invitation.candidate.email,
            phone: invitation.candidate.phone,
            skills: invitation.candidate.skills,
            resume_url: invitation.candidate.resume_url,
            status: invitation.candidate.status,
            job: jobDetails,
          }
        : null,
      evaluation: evaluationData,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      completed_at: invitation.completed_at,
      submitted_at: invitation.completed_at,
      evaluation_link: evalLink,
      evaluation_url: evalLink,
    };
  }

  /**
   * Dispatches interview invitation email via Google OAuth2 / Gmail API.
   * Reuses existing PENDING invitation without duplicating tokens.
   */
  async sendInterviewInvitation(candidateId: number, recipientEmailOverride?: string): Promise<any> {
    // 1. Find candidate with Job and Tech Lead relations
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
      relations: ['job', 'tech_lead'],
    });

    // 2. Verify candidate exists
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found.`);
    }

    // 3. Verify candidate has an assigned Job
    if (!candidate.job) {
      throw new BadRequestException('Candidate has no assigned job.');
    }

    // 4. Verify candidate has an assigned Tech Lead
    if (!candidate.tech_lead_id || !candidate.tech_lead) {
      throw new BadRequestException(
        'Please assign a Tech Lead before sending the interview invitation.',
      );
    }

    // 5. Verify assigned Tech Lead is ACTIVE
    if (candidate.tech_lead.status !== TechLeadStatus.ACTIVE) {
      throw new BadRequestException('Selected Tech Lead is inactive.');
    }

    // 6 & 7. Create or reuse the interview invitation (guarantees idempotent reuse of valid pending tokens)
    const invitationData = await this.createOrGetInvitation({
      candidate_id: candidateId,
    });

    // 8. Generate evaluation URL
    const evalLink =
      invitationData.evaluation_link ||
      invitationData.evaluation_url ||
      this.getEvaluationLink(invitationData.token);

    // 9. Generate AI JD Summary (with graceful fallback)
    let jdSummary = '';
    try {
      jdSummary = await this.groqService.summarizeJobDescription(
        candidate.job.title,
        candidate.job.description,
        candidate.job.required_skills,
      );
    } catch (aiErr: any) {
      this.logger.warn(`Could not generate AI JD summary: ${aiErr.message}`);
    }

    // 10. Prepare attachments: Job Description PDF & Candidate Resume
    const attachments: EmailAttachment[] = [];

    // A. Generate Job Description PDF
    try {
      const jdPdfBuffer =
        await this.pdfGeneratorService.generateJobDescriptionPdf({
          title: candidate.job.title,
          department: candidate.job.department,
          location: candidate.job.location,
          experience_required: candidate.job.experience_required,
          description: candidate.job.description,
          required_skills: candidate.job.required_skills,
        });

      const safeJobTitle =
        candidate.job.title
          .replace(/[^\w\s-]/gi, '')
          .trim()
          .replace(/\s+/g, '_') || 'Role';

      attachments.push({
        filename: `Job_Description_${safeJobTitle}.pdf`,
        contentType: 'application/pdf',
        content: jdPdfBuffer,
      });
    } catch (pdfErr: any) {
      this.logger.error(
        `Failed to generate Job Description PDF attachment: ${pdfErr.message}`,
      );
    }

    // B. Fetch and attach Candidate Resume if present
    if (candidate.resume_url && candidate.resume_url.trim().length > 0) {
      try {
        const resumeAttachment = await this.fetchResumeAttachment(candidate);
        if (resumeAttachment) {
          attachments.push(resumeAttachment);
        }
      } catch (resumeErr: any) {
        this.logger.warn(
          `Could not attach resume for candidate ${candidate.id}: ${resumeErr.message}`,
        );
      }
    }

    const targetRecipientEmail =
      recipientEmailOverride ||
      candidate.job.contact_email ||
      invitationData.tech_lead?.email ||
      candidate.tech_lead.email;

    const targetRecipientName =
      recipientEmailOverride || candidate.job.contact_email
        ? 'Technical Evaluator'
        : (invitationData.tech_lead?.name || candidate.tech_lead.name);

    // 11. Call EmailService -> GmailService and send email with attachments
    try {
      const emailResult = await this.emailService.sendInterviewInvitationEmail({
        techLeadName: targetRecipientName,
        techLeadEmail: targetRecipientEmail,
        candidateName: invitationData.candidate?.name || candidate.name,
        jobTitle: invitationData.job?.title || candidate.job.title,
        evaluationLink: evalLink,
        expiresAt: invitationData.expires_at,
        jdSummary,
        jobDepartment: candidate.job.department,
        jobLocation: candidate.job.location,
        jobExperience: candidate.job.experience_required,
        requiredSkills: candidate.job.required_skills,
        attachments,
      });

      this.logger.log(
        `[Gmail] Interview invitation email sent to ${targetRecipientEmail} for candidate ${candidate.id} (${attachments.length} attachment(s))`,
      );

      return {
        success: true,
        message: 'Interview invitation sent successfully to Tech Lead.',
        messageId: emailResult.messageId,
        attachmentsCount: attachments.length,
        invitation: invitationData,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to send interview invitation email for candidate ${candidateId}: ${err.message}`,
      );
      // Re-throw so HR receives clear feedback; existing PENDING invitation remains intact for retry
      throw err;
    }
  }

  /**
   * Resolves and downloads/reads candidate resume file for attachment.
   */
  private async fetchResumeAttachment(
    candidate: Candidate,
  ): Promise<EmailAttachment | null> {
    const resumeUrl = candidate.resume_url?.trim();
    if (!resumeUrl) return null;

    const safeName =
      candidate.name
        .replace(/[^\w\s-]/gi, '')
        .trim()
        .replace(/\s+/g, '_') || 'Candidate';

    // Case 1: Remote HTTP/HTTPS URL
    if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(resumeUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          this.logger.warn(
            `Resume download returned HTTP ${res.status} for URL: ${resumeUrl}`,
          );
          return null;
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!buffer || buffer.length === 0) return null;

        const contentTypeHeader =
          res.headers.get('content-type')?.toLowerCase() || '';

        let ext = 'pdf';
        let contentType = 'application/pdf';

        if (
          contentTypeHeader.includes('word') ||
          contentTypeHeader.includes('docx') ||
          resumeUrl.toLowerCase().endsWith('.docx')
        ) {
          ext = 'docx';
          contentType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (
          contentTypeHeader.includes('msword') ||
          resumeUrl.toLowerCase().endsWith('.doc')
        ) {
          ext = 'doc';
          contentType = 'application/msword';
        }

        return {
          filename: `${safeName}_Resume.${ext}`,
          contentType,
          content: buffer,
        };
      } catch (fetchErr: any) {
        this.logger.warn(
          `Failed to download resume from ${resumeUrl}: ${fetchErr.message}`,
        );
        return null;
      }
    }

    // Case 2: Local filesystem path
    const localPath = path.isAbsolute(resumeUrl)
      ? resumeUrl
      : path.resolve(process.cwd(), resumeUrl);

    if (fs.existsSync(localPath)) {
      try {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).replace('.', '') || 'pdf';
        const contentType =
          ext === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : ext === 'doc'
            ? 'application/msword'
            : 'application/pdf';

        return {
          filename: `${safeName}_Resume.${ext}`,
          contentType,
          content: buffer,
        };
      } catch (readErr: any) {
        this.logger.warn(
          `Failed to read local resume from ${localPath}: ${readErr.message}`,
        );
        return null;
      }
    }

    this.logger.warn(
      `Candidate resume URL is neither an accessible URL nor an existing file: ${resumeUrl}`,
    );
    return null;
  }
}

