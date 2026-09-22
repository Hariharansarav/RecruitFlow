import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidateStatus } from '../candidates/enums/candidate-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { CandidateMatchingService } from '../candidates/candidate-matching.service';
import {
  CompanyDecisionDto,
  CompanyDecision,
} from './dto/company-decision.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    private readonly candidateMatchingService: CandidateMatchingService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Validates that the provided companyId corresponds to an existing user with role COMPANY.
   */
  async validateCompanyUser(companyId?: number): Promise<User> {
    if (companyId === undefined || companyId === null || isNaN(companyId)) {
      throw new BadRequestException('company_id query parameter is required');
    }

    const user = await this.userRepository.findOne({
      where: { id: companyId },
    });

    if (!user) {
      throw new NotFoundException(`Company user with ID ${companyId} not found`);
    }

    if (user.role !== UserRole.COMPANY) {
      throw new ForbiddenException(
        `Only COMPANY users are permitted to access company review endpoints. User '${user.name}' has role '${user.role}'`,
      );
    }

    return user;
  }

  /**
   * Retrieve company dashboard summary metrics.
   * total_submitted: candidates that have been submitted to the company or reached final decision
   * pending_review: candidates with status SUBMITTED_TO_COMPANY
   * accepted: candidates with status ACCEPTED
   * rejected: candidates with status REJECTED
   */
  async getDashboard(companyId?: number) {
    await this.validateCompanyUser(companyId);

    const pendingReviewCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.SUBMITTED_TO_COMPANY },
    });

    const acceptedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.ACCEPTED },
    });

    const rejectedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.REJECTED },
    });

    const totalSubmitted = pendingReviewCount + acceptedCount + rejectedCount;

    return {
      total_submitted: totalSubmitted,
      pending_review: pendingReviewCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
    };
  }

  /**
   * Normalizes comma-separated required skills from Job JD.
   */
  normalizeSkills(skillsStr?: string | null): string[] {
    if (!skillsStr || typeof skillsStr !== 'string') return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of skillsStr.split(',')) {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length > 0 && !seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
    return result;
  }

  /**
   * Retrieve list of candidates submitted to company.
   * Can be filtered by a specific status (e.g. ACCEPTED, REJECTED, SUBMITTED_TO_COMPANY),
   * or returns all relevant reviewable candidates (SUBMITTED_TO_COMPANY, ACCEPTED, REJECTED).
   */
  async getSubmittedCandidates(
    companyId?: number,
    statusFilter?: CandidateStatus,
  ) {
    await this.validateCompanyUser(companyId);

    const whereCondition = statusFilter
      ? { status: statusFilter }
      : [
          { status: CandidateStatus.SUBMITTED_TO_COMPANY },
          { status: CandidateStatus.ACCEPTED },
          { status: CandidateStatus.REJECTED },
        ];

    const candidates = await this.candidateRepository.find({
      where: whereCondition,
      relations: ['job'],
      order: {
        updated_at: 'DESC',
      },
    });

    const result = await Promise.all(
      candidates.map(async (c) => {
        const evaluation = await this.evaluationRepository.findOne({
          where: { candidate_id: c.id },
          relations: ['skills'],
        });

        const requiredSkills = this.normalizeSkills(c.job?.required_skills);
        const maxScore = requiredSkills.length * 5;
        let matchPercentage = 0;
        let overallScore: number | null = null;

        if (evaluation) {
          overallScore = Number(evaluation.score);
          const totalScore =
            evaluation.skills && evaluation.skills.length > 0
              ? evaluation.skills.reduce((sum, s) => sum + Number(s.score), 0)
              : Math.round(overallScore * requiredSkills.length);
          matchPercentage =
            maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        }

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          skills: c.skills,
          resume_url: c.resume_url,
          status: c.status,
          created_at: c.created_at,
          updated_at: c.updated_at,
          job: {
            id: c.job.id,
            title: c.job.title,
            department: c.job.department,
          },
          interviewer_email: c.interviewer_email || null,
          match_percentage: matchPercentage,
          interview: evaluation
            ? {
                score: overallScore,
                notes: evaluation.notes,
                interviewer_email:
                  evaluation.interviewer_email || c.interviewer_email || null,
              }
            : null,
        };
      }),
    );

    return result;
  }


  /**
   * Retrieve pending candidates (status = SUBMITTED_TO_COMPANY).
   */
  async getPendingCandidates(companyId?: number) {
    return this.getSubmittedCandidates(
      companyId,
      CandidateStatus.SUBMITTED_TO_COMPANY,
    );
  }

  /**
   * Retrieve accepted candidates (status = ACCEPTED).
   */
  async getAcceptedCandidates(companyId?: number) {
    return this.getSubmittedCandidates(companyId, CandidateStatus.ACCEPTED);
  }

  /**
   * Retrieve rejected candidates (status = REJECTED).
   */
  async getRejectedCandidates(companyId?: number) {
    return this.getSubmittedCandidates(companyId, CandidateStatus.REJECTED);
  }

  /**
   * Make a hiring decision on a submitted candidate (ACCEPT or REJECT).
   * Transition candidate.status accordingly.
   */
  async makeDecision(candidateId: number, dto: CompanyDecisionDto) {
    const { company_id, decision } = dto;

    // 1. Validate company user
    await this.validateCompanyUser(company_id);

    // 2. Find candidate by ID with job relation
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
      relations: ['job'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // 3. Prevent duplicate decisions if already finalized
    if (
      candidate.status === CandidateStatus.ACCEPTED ||
      candidate.status === CandidateStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Candidate decision has already been finalized.',
      );
    }

    // 4. Verify candidate is in SUBMITTED_TO_COMPANY status
    if (candidate.status !== CandidateStatus.SUBMITTED_TO_COMPANY) {
      throw new BadRequestException(
        'Only submitted candidates can be accepted or rejected.',
      );
    }

    // 5. Update status according to decision
    if (decision === CompanyDecision.ACCEPT) {
      candidate.status = CandidateStatus.ACCEPTED;
      await this.candidateRepository.save(candidate);

      this.logger.log(
        `Candidate ID ${candidate.id} ACCEPTED by Company ID ${company_id}`,
      );

      return {
        message: 'Candidate accepted successfully.',
        candidate: {
          id: candidate.id,
          name: candidate.name,
          status: candidate.status,
        },
        email_sent: false,
      };
    } else if (decision === CompanyDecision.REJECT) {
      candidate.status = CandidateStatus.REJECTED;
      await this.candidateRepository.save(candidate);

      this.logger.log(
        `Candidate ID ${candidate.id} REJECTED by Company ID ${company_id}`,
      );

      // Attempt to send rejection email to candidate
      const jobTitle = candidate.job?.title || 'Open Position';
      const emailSent = await this.emailService.sendRejectionEmail(
        candidate.name,
        candidate.email,
        jobTitle,
      );

      if (emailSent) {
        return {
          message: 'Candidate rejected and notification email sent successfully.',
          candidate: {
            id: candidate.id,
            name: candidate.name,
            status: candidate.status,
          },
          email_sent: true,
        };
      } else {
        return {
          message: 'Candidate rejected, but rejection email could not be sent.',
          candidate: {
            id: candidate.id,
            name: candidate.name,
            status: candidate.status,
          },
          email_sent: false,
        };
      }
    }
  }

  /**
   * Retrieve complete details for a single candidate submitted to the company.
   * Rejects unsubmitted candidates (APPLIED, EVALUATED) with 404 Not Found.
   */
  async getSubmittedCandidateById(id: number, companyId?: number) {
    await this.validateCompanyUser(companyId);

    const candidate = await this.candidateRepository.findOne({
      where: { id },
      relations: ['job', 'submitted_by'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    if (
      candidate.status !== CandidateStatus.SUBMITTED_TO_COMPANY &&
      candidate.status !== CandidateStatus.ACCEPTED &&
      candidate.status !== CandidateStatus.REJECTED
    ) {
      throw new NotFoundException(
        'Candidate has not been submitted to the company',
      );
    }

    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: id },
      relations: ['hr', 'skills'],
    });

    const requiredSkills = this.normalizeSkills(candidate.job.required_skills);
    const maxScore = requiredSkills.length * 5;
    let matchPercentage = 0;
    let overallScore: number | null = null;
    let totalScore = 0;

    if (evaluation) {
      overallScore = Number(evaluation.score);
      totalScore =
        evaluation.skills && evaluation.skills.length > 0
          ? evaluation.skills.reduce((sum, s) => sum + Number(s.score), 0)
          : Math.round(overallScore * requiredSkills.length);
      matchPercentage =
        maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    }

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        resume_url: candidate.resume_url,
        status: candidate.status,
        interviewer_email: candidate.interviewer_email || null,
      },
      job: {
        id: candidate.job.id,
        title: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location || 'Remote',
        experience_required: candidate.job.experience_required || 'Not specified',
        description: candidate.job.description,
        required_skills: candidate.job.required_skills,
      },
      match: {
        match_percentage: matchPercentage,
        total_score: totalScore,
        maximum_score: maxScore,
        overall_score: overallScore,
        required_skills: requiredSkills,
      },
      interview_evaluation: evaluation
        ? {
            id: evaluation.id,
            score: overallScore,
            overall_score: overallScore,
            notes: evaluation.notes,
            skills:
              evaluation.skills?.map((s) => ({
                id: s.id,
                skill: s.skill,
                score: Number(s.score),
              })) || [],
            created_at: evaluation.created_at,
            updated_at: evaluation.updated_at,
            interviewer_email:
              evaluation.interviewer_email || candidate.interviewer_email || null,
            hr: evaluation.hr
              ? {
                  id: evaluation.hr.id,
                  name: evaluation.hr.name,
                  email: evaluation.hr.email,
                }
              : null,
          }
        : null,

      submitted_by: candidate.submitted_by
        ? {
            id: candidate.submitted_by.id,
            name: candidate.submitted_by.name,
            email: candidate.submitted_by.email,
          }
        : evaluation?.hr
        ? {
            id: evaluation.hr.id,
            name: evaluation.hr.name,
            email: evaluation.hr.email,
          }
        : null,
    };
  }
}
