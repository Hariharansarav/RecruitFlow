import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from './entities/candidate.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../jobs/enums/job-status.enum';
import { CandidateStatus } from './enums/candidate-status.enum';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { SubmitCandidateDto } from './dto/submit-candidate.dto';
import { CandidateMatchingService } from './candidate-matching.service';
import { InterviewEvaluation } from '../interview-evaluations/entities/interview-evaluation.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { TechLead } from '../tech-leads/entities/tech-lead.entity';
import { TechLeadStatus } from '../tech-leads/enums/tech-lead-status.enum';
import { InterviewInvitationsService } from '../interview-invitations/interview-invitations.service';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TechLead)
    private readonly techLeadRepository: Repository<TechLead>,
    private readonly candidateMatchingService: CandidateMatchingService,
    private readonly interviewInvitationsService: InterviewInvitationsService,
  ) {}

  /**
   * Create a new candidate for a job.
   * Enforces that the job exists and its status is OPEN.
   */
  async create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    const { name, email, phone, resume_url, job_id, tech_lead_id } = createCandidateDto;

    // 1. Verify that the job exists
    const job = await this.jobRepository.findOne({
      where: { id: job_id },
    });

    if (!job) {
      throw new NotFoundException('Selected job was not found.');
    }

    // 2. Verify that the job is OPEN
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Candidates can only be added to open jobs.');
    }

    // 3. Resolve Tech Lead (use provided or auto-select first active tech lead)
    let techLead: TechLead | null = null;
    if (tech_lead_id) {
      techLead = await this.techLeadRepository.findOne({
        where: { id: tech_lead_id },
      });

      if (!techLead) {
        throw new NotFoundException('Selected Tech Lead was not found.');
      }

      if (techLead.status !== TechLeadStatus.ACTIVE) {
        throw new BadRequestException('Selected Tech Lead is inactive.');
      }
    } else {
      techLead = await this.techLeadRepository.findOne({
        where: { status: TechLeadStatus.ACTIVE },
        order: { id: 'ASC' },
      });

      if (!techLead) {
        techLead = await this.techLeadRepository.findOne({
          order: { id: 'ASC' },
        });
      }
    }

    if (!techLead) {
      throw new BadRequestException('No evaluator or tech lead available in the system.');
    }

    // 4. Create candidate with status APPLIED (skills default to empty string)
    const candidate = this.candidateRepository.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      skills: '',
      resume_url: resume_url && resume_url.trim() ? resume_url.trim() : null,
      status: CandidateStatus.APPLIED,
      job_id: job.id,
      job,
      tech_lead_id: techLead.id,
      tech_lead: techLead,
    });

    const savedCandidate = await this.candidateRepository.save(candidate);
    CandidatesService.invalidateCache();

    // 5. Automatically send evaluation email to JD contact_email or tech lead
    const evaluationRecipient = job.contact_email || techLead.email;
    if (evaluationRecipient) {
      this.interviewInvitationsService
        .sendInterviewInvitation(savedCandidate.id, evaluationRecipient)
        .then(() => {
          this.logger.log(
            `[Evaluation Dispatch] Auto-sent candidate evaluation link to ${evaluationRecipient} for candidate ${savedCandidate.name} (Job: ${job.title})`,
          );
        })
        .catch((dispatchErr) => {
          this.logger.warn(
            `[Evaluation Dispatch] Notice: Could not auto-dispatch evaluation email to ${evaluationRecipient}: ${dispatchErr.message}`,
          );
        });
    }

    // Return candidate with basic job & tech lead info
    return this.findOne(savedCandidate.id);
  }


  /**
   * Validate that the requesting user exists and is an HR user.
   */
  async validateHrUser(hrId?: number): Promise<User | null> {
    if (hrId === undefined || hrId === null || isNaN(hrId)) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { id: hrId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${hrId} not found`);
    }

    if (user.role !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to perform this operation. User '${user.name}' has role '${user.role}'`,
      );
    }

    return user;
  }

  /**
   * Return all candidates sorted newest first, including basic job info.
   */
  async findAll(): Promise<Candidate[]> {
    return this.candidateRepository.find({
      relations: ['job', 'tech_lead'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        status: true,
        job_id: true,
        tech_lead_id: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
        },
        tech_lead: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
      order: {
        created_at: 'DESC',
      },
    });
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

  private static cachedScreeningData: any = null;
  private static cacheExpiresAt: number = 0;
  private static readonly CACHE_TTL_MS: number = 30000;

  public static invalidateCache() {
    CandidatesService.cachedScreeningData = null;
    CandidatesService.cacheExpiresAt = 0;
  }

  /**
   * Return all candidates with pre-calculated JD matching details.
   */
  async findAllWithScreening() {
    const now = Date.now();
    if (CandidatesService.cachedScreeningData && now < CandidatesService.cacheExpiresAt) {
      return CandidatesService.cachedScreeningData;
    }

    const candidates = await this.candidateRepository.find({
      relations: ['job', 'tech_lead'],
      order: {
        created_at: 'DESC',
      },
    });

    const evaluations = await this.evaluationRepository.find({
      relations: ['skills'],
    });

    const evalMap = new Map<number, InterviewEvaluation>();
    for (const ev of evaluations) {
      evalMap.set(ev.candidate_id, ev);
    }

    const result = candidates.map((c) => {
      const evaluation = evalMap.get(c.id);
      const requiredSkills = this.normalizeSkills(c.job?.required_skills);
      const maxScore = requiredSkills.length * 5;

      let matchPercentage: number | null = null;
      let overallScore: number | null = null;

      if (evaluation) {
        overallScore = Number(evaluation.score);
        if (
          evaluation.jd_match_percentage !== null &&
          evaluation.jd_match_percentage !== undefined
        ) {
          matchPercentage = Math.round(Number(evaluation.jd_match_percentage));
        } else {
          const totalScore =
            evaluation.skills && evaluation.skills.length > 0
              ? evaluation.skills.reduce((sum, s) => sum + Number(s.score), 0)
              : Math.round(overallScore * requiredSkills.length);

          matchPercentage =
            maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        }
      }

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        skills: c.skills,
        resume_url: c.resume_url,
        status: c.status,
        job_id: c.job_id,
        job: c.job
          ? {
              id: c.job.id,
              title: c.job.title,
              department: c.job.department,
              required_skills: c.job.required_skills,
            }
          : null,
        tech_lead_id: c.tech_lead_id,
        tech_lead: c.tech_lead
          ? {
              id: c.tech_lead.id,
              name: c.tech_lead.name,
              email: c.tech_lead.email,
              status: c.tech_lead.status,
            }
          : null,
        match_percentage: matchPercentage,
        overall_score: overallScore,
        interview_score: overallScore,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    });

    CandidatesService.cachedScreeningData = result;
    CandidatesService.cacheExpiresAt = now + CandidatesService.CACHE_TTL_MS;
    return result;
  }


  /**
   * Return single candidate by ID with related job details.
   */
  async findOne(id: number): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOne({
      where: { id },
      relations: ['job', 'tech_lead'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        status: true,
        job_id: true,
        tech_lead_id: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
          description: true,
          required_skills: true,
        },
        tech_lead: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    return candidate;
  }

  /**
   * Return all candidates for a specified job ID.
   */
  async findByJob(jobId: number): Promise<Candidate[]> {
    // 1. Verify job exists
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // 2. Return candidates for this job
    return this.candidateRepository.find({
      where: { job_id: jobId },
      relations: ['job', 'tech_lead'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        status: true,
        job_id: true,
        tech_lead_id: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
        },
        tech_lead: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Update a candidate by ID.
   * Disallows changing job_id.
   */
  async update(
    id: number,
    updateCandidateDto: UpdateCandidateDto,
    hrId?: number,
  ): Promise<Candidate> {
    await this.validateHrUser(hrId);

    // 1. Verify candidate exists
    const existingCandidate = await this.findOne(id);

    // 2. Merge allowed fields (status is controlled strictly via workflow)
    const { name, email, phone, skills, resume_url, tech_lead_id } = updateCandidateDto;

    if (name !== undefined) existingCandidate.name = name;
    if (email !== undefined) existingCandidate.email = email;
    if (phone !== undefined) existingCandidate.phone = phone;
    if (skills !== undefined) existingCandidate.skills = skills;
    if (resume_url !== undefined) existingCandidate.resume_url = resume_url;

    if (tech_lead_id !== undefined) {
      const techLead = await this.techLeadRepository.findOne({
        where: { id: tech_lead_id },
      });

      if (!techLead) {
        throw new NotFoundException('Selected Tech Lead was not found.');
      }

      if (techLead.status !== TechLeadStatus.ACTIVE) {
        throw new BadRequestException('Selected Tech Lead is inactive.');
      }

      existingCandidate.tech_lead_id = techLead.id;
      existingCandidate.tech_lead = techLead;
    }

    await this.candidateRepository.save(existingCandidate);
    CandidatesService.invalidateCache();

    return this.findOne(id);
  }

  /**
   * Delete a candidate by ID.
   */
  async remove(id: number, hrId?: number): Promise<{ message: string; id: number }> {
    await this.validateHrUser(hrId);

    // 1. Verify candidate exists
    await this.findOne(id);

    // 2. Delete
    await this.candidateRepository.delete(id);
    CandidatesService.invalidateCache();

    return {
      message: `Candidate with ID ${id} has been deleted successfully`,
      id,
    };
  }

  /**
   * Calculate matching percentage and skills overlap between candidate and job.
   * Dynamic calculation without storing in DB.
   */
  async getMatch(id: number) {
    const candidate = await this.findOne(id);
    const matchResult = this.candidateMatchingService.calculateMatch(
      candidate.skills,
      candidate.job?.required_skills,
    );

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        skills: candidate.skills,
      },
      job: {
        id: candidate.job?.id ?? candidate.job_id,
        title: candidate.job?.title ?? 'Unknown',
        required_skills: candidate.job?.required_skills ?? '',
      },
      matched_skills: matchResult.matched_skills,
      missing_skills: matchResult.missing_skills,
      match_percentage: matchResult.match_percentage,
    };
  }

  /**
   * Retrieve screening summary combining candidate, job, matching details, and interview evaluation.
   */
  async getScreening(id: number) {
    const candidate = await this.findOne(id);
    const requiredSkills = this.normalizeSkills(candidate.job?.required_skills);

    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: id },
      relations: ['hr', 'tech_lead', 'skills'],
    });

    let totalScore: number | null = null;
    const maximumScore = requiredSkills.length * 5;
    let overallScore: number | null = null;
    let matchPercentage: number | null = null;

    if (evaluation) {
      totalScore =
        evaluation.skills && evaluation.skills.length > 0
          ? evaluation.skills.reduce((sum, s) => sum + Number(s.score), 0)
          : Math.round(Number(evaluation.score) * requiredSkills.length);
      overallScore = Number(evaluation.score);
      matchPercentage =
        evaluation.jd_match_percentage !== null &&
        evaluation.jd_match_percentage !== undefined
          ? Math.round(Number(evaluation.jd_match_percentage))
          : maximumScore > 0
          ? Math.round((totalScore / maximumScore) * 100)
          : Math.round((overallScore / 5) * 100);
    }

    const evaluationPayload = evaluation
      ? {
          id: evaluation.id,
          score: overallScore,
          overall_score: overallScore,
          jd_match_percentage: matchPercentage,
          match_percentage: matchPercentage,
          notes: evaluation.notes,
          skills:
            evaluation.skills?.map((s) => ({
              id: s.id,
              skill: s.skill,
              score: Number(s.score),
            })) || [],
          hr: evaluation.hr
            ? {
                id: evaluation.hr.id,
                name: evaluation.hr.name,
                email: evaluation.hr.email,
              }
            : null,
          tech_lead: evaluation.tech_lead
            ? {
                id: evaluation.tech_lead.id,
                name: evaluation.tech_lead.name,
                email: evaluation.tech_lead.email,
              }
            : null,
          created_at: evaluation.created_at,
          updated_at: evaluation.updated_at,
        }
      : null;

    const matchingPayload = {
      requiredSkills,
      totalScore,
      maximumScore,
      overallScore,
      matchPercentage,
      // Backward compatibility aliases
      required_skills: requiredSkills,
      matched_skills: [],
      missing_skills: [],
      match_percentage: matchPercentage ?? 0,
    };

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        resume_url: candidate.resume_url,
        status: candidate.status,
        tech_lead_id: candidate.tech_lead_id,
        tech_lead: candidate.tech_lead,
      },
      job: {
        id: candidate.job?.id ?? candidate.job_id,
        title: candidate.job?.title ?? 'Unknown',
        department: candidate.job?.department ?? '',
        description: candidate.job?.description ?? '',
        required_skills: candidate.job?.required_skills ?? '',
      },
      evaluation: evaluationPayload,
      matching: matchingPayload,
      match: matchingPayload,
      interview_evaluation: evaluationPayload,
      interview: evaluationPayload
        ? {
            id: evaluationPayload.id,
            score: evaluationPayload.score,
            notes: evaluationPayload.notes,
          }
        : null,
    };
  }

  /**
   * Submit an evaluated candidate to the company.
   * Enforces that:
   * - Candidate exists
   * - HR user exists and has role HR
   * - Candidate has a valid job
   * - Candidate status is EVALUATED (cannot submit if APPLIED, SUBMITTED_TO_COMPANY, ACCEPTED, REJECTED)
   * - Candidate has an interview evaluation and all JD skills evaluated
   * Transitions status to SUBMITTED_TO_COMPANY.
   */
  async submitCandidate(
    candidateId: number,
    submitCandidateDto: SubmitCandidateDto,
  ) {
    const { hr_id } = submitCandidateDto;

    // 1. Find candidate by ID
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
      relations: ['job'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // 2. Find HR user by hr_id
    const hrUser = await this.userRepository.findOne({
      where: { id: hr_id },
    });

    if (!hrUser) {
      throw new NotFoundException(`HR user with ID ${hr_id} not found`);
    }

    // 3. Verify HR role
    if (hrUser.role !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to submit candidates. User '${hrUser.name}' has role '${hrUser.role}'`,
      );
    }

    // 4. Verify candidate has a job
    if (!candidate.job) {
      throw new NotFoundException(
        `Associated job not found for candidate with ID ${candidateId}`,
      );
    }

    // 5. Verify candidate status
    if (candidate.status === CandidateStatus.SUBMITTED_TO_COMPANY) {
      throw new BadRequestException(
        'Candidate has already been submitted to the company.',
      );
    }

    if (
      candidate.status === CandidateStatus.ACCEPTED ||
      candidate.status === CandidateStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot submit candidate with status ${candidate.status}.`,
      );
    }

    if (candidate.status !== CandidateStatus.EVALUATED) {
      throw new BadRequestException(
        'Candidate must be evaluated before submission.',
      );
    }

    // 6. Verify interview evaluation exists
    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: candidateId },
      relations: ['skills'],
    });

    if (!evaluation) {
      throw new BadRequestException(
        'Interview evaluation is required before submitting the candidate.',
      );
    }

    // Verify all required skills have been evaluated
    const requiredSkills = this.normalizeSkills(candidate.job.required_skills);
    if (
      requiredSkills.length > 0 &&
      evaluation.skills &&
      evaluation.skills.length > 0
    ) {
      const evaluatedSkillNames = new Set(
        evaluation.skills.map((s) => s.skill.toLowerCase()),
      );
      const unevaluated = requiredSkills.filter(
        (rs) => !evaluatedSkillNames.has(rs.toLowerCase()),
      );
      if (unevaluated.length > 0) {
        throw new BadRequestException(
          'All required skills must be evaluated before submitting to company.',
        );
      }
    }

    // 7. Update candidate status and submitted_by
    candidate.status = CandidateStatus.SUBMITTED_TO_COMPANY;
    candidate.submitted_by_id = hrUser.id;
    candidate.submitted_by = hrUser;
    await this.candidateRepository.save(candidate);
    CandidatesService.invalidateCache();

    this.logger.log(
      `Candidate ID ${candidate.id} submitted to company by HR User ID ${hrUser.id}`,
    );

    return {
      message: 'Candidate submitted to company successfully',
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
      },
    };
  }


  /**
   * Retrieve all candidates with status SUBMITTED_TO_COMPANY sorted newest first.
   */
  async findSubmittedCandidates() {
    const candidates = await this.candidateRepository.find({
      where: { status: CandidateStatus.SUBMITTED_TO_COMPANY },
      relations: ['job', 'submitted_by'],
      order: {
        updated_at: 'DESC',
      },
    });

    const result = await Promise.all(
      candidates.map(async (c) => {
        const evaluation = await this.evaluationRepository.findOne({
          where: { candidate_id: c.id },
          relations: ['hr'],
        });

        const matchResult = this.candidateMatchingService.calculateMatch(
          c.skills,
          c.job?.required_skills,
        );

        return {
          candidate: {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            skills: c.skills,
            resume_url: c.resume_url,
            status: c.status,
          },
          job: {
            id: c.job.id,
            title: c.job.title,
            department: c.job.department,
            description: c.job.description,
            required_skills: c.job.required_skills,
          },
          match: {
            match_percentage: matchResult.match_percentage,
            matched_skills: matchResult.matched_skills,
            missing_skills: matchResult.missing_skills,
          },
          interview_evaluation: evaluation
            ? {
                score: evaluation.score,
                notes: evaluation.notes,
              }
            : null,
          submitted_by: c.submitted_by
            ? {
                id: c.submitted_by.id,
                name: c.submitted_by.name,
                email: c.submitted_by.email,
              }
            : evaluation?.hr
            ? {
                id: evaluation.hr.id,
                name: evaluation.hr.name,
                email: evaluation.hr.email,
              }
            : null,
        };
      }),
    );

    return result;
  }

  /**
   * Retrieve a single submitted candidate by ID.
   */
  async findSubmittedCandidateById(id: number) {
    const candidate = await this.candidateRepository.findOne({
      where: { id },
      relations: ['job', 'submitted_by'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    if (candidate.status !== CandidateStatus.SUBMITTED_TO_COMPANY) {
      throw new NotFoundException(
        `Submitted candidate with ID ${id} not found`,
      );
    }

    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: id },
      relations: ['hr'],
    });

    const matchResult = this.candidateMatchingService.calculateMatch(
      candidate.skills,
      candidate.job?.required_skills,
    );

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        resume_url: candidate.resume_url,
        status: candidate.status,
      },
      job: {
        id: candidate.job.id,
        title: candidate.job.title,
        department: candidate.job.department,
        description: candidate.job.description,
        required_skills: candidate.job.required_skills,
      },
      match: {
        match_percentage: matchResult.match_percentage,
        matched_skills: matchResult.matched_skills,
        missing_skills: matchResult.missing_skills,
      },
      interview_evaluation: evaluation
        ? {
            score: evaluation.score,
            notes: evaluation.notes,
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
