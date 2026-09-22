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
import { InterviewInvitationsService } from '../interview-invitations/interview-invitations.service';
import { GroqService } from '../ai-job/groq.service';
import { DocumentParserService } from '../ai-job/document-parser.service';
import * as fs from 'fs';
import * as path from 'path';

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
    private readonly candidateMatchingService: CandidateMatchingService,
    private readonly interviewInvitationsService: InterviewInvitationsService,
    private readonly groqService: GroqService,
    private readonly documentParserService: DocumentParserService,
  ) {}

  /**
   * Evaluates whether a candidate's resume matches the Job Description.
   * Defined as having an ATS match percentage >= 80% and recommendation !== 'POOR_MATCH'.
   */
  isResumeMatchingJd(candidate: Candidate): boolean {
    const match = candidate.ai_match_percentage;
    if (match === null || match === undefined || isNaN(Number(match))) {
      return false;
    }
    if (Number(match) < 80) {
      return false;
    }
    if (candidate.ai_screening_details) {
      try {
        const details = JSON.parse(candidate.ai_screening_details);
        if (details.recommendation === 'POOR_MATCH') {
          return false;
        }
      } catch {}
    }
    return true;
  }

  /**
   * Create a new candidate for a job.
   * Enforces that the job exists and its status is OPEN.
   */
  async create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    const { name, email, phone, resume_url, job_id } = createCandidateDto;

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

    if (!resume_url || !resume_url.trim()) {
      throw new BadRequestException(
        'Resume document or URL is required for candidate screening.',
      );
    }

    // 3. Create candidate with status APPLIED
    const candidate = this.candidateRepository.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      skills: (createCandidateDto.skills || '').trim(),
      resume_url: resume_url.trim(),
      resume_text: createCandidateDto.resume_text?.trim() || null,
      interviewer_email: createCandidateDto.interviewer_email?.trim() || null,
      interview_date: createCandidateDto.interview_date?.trim() || null,
      interview_time: createCandidateDto.interview_time?.trim() || null,
      gmeet_link: createCandidateDto.gmeet_link?.trim() || null,
      status: CandidateStatus.APPLIED,
      job_id: job.id,
      job,
    });

    const savedCandidate = await this.candidateRepository.save(candidate);
    CandidatesService.invalidateCache();

    // 5. Stage 1: AI Resume Screening (NO automatic email dispatch!)
    try {
      await this.screenCandidateResume(savedCandidate.id);
    } catch (screenErr: any) {
      this.logger.warn(
        `AI Resume screening notice for candidate ${savedCandidate.id}: ${screenErr.message}`,
      );
    }

    // Return candidate with basic job & tech lead info
    return this.findOne(savedCandidate.id);
  }

  /**
   * Stage 1: AI Resume Screening
   * Compares candidate resume against the Job Description using Groq AI.
   * Computes match percentage (0-100%), strengths, missing skills, and detailed summary.
   */
  async screenCandidateResume(candidateId: number): Promise<any> {
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
      relations: ['job'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    if (!candidate.job) {
      throw new BadRequestException('Candidate is not assigned to a valid job requisition');
    }

    // Extract resume text
    let resumeContent = (candidate.resume_text || '').trim();

    if (!resumeContent && candidate.resume_url) {
      resumeContent = await this.extractResumeText(candidate.resume_url);
      if (resumeContent) {
        candidate.resume_text = resumeContent;
      }
    }

    if (!resumeContent) {
      resumeContent = `Candidate: ${candidate.name}\nSkills: ${candidate.skills || 'Software Engineer'}\nEmail: ${candidate.email}\nPhone: ${candidate.phone}`;
    }

    // Call GroqService to screen resume against Job
    const screeningResult = await this.groqService.screenResumeAgainstJob(
      {
        title: candidate.job.title,
        description: candidate.job.description,
        required_skills: candidate.job.required_skills,
        experience_required: candidate.job.experience_required,
      },
      resumeContent,
    );

    // Persist screening score and details
    candidate.ai_match_percentage = screeningResult.match_percentage;
    candidate.ai_screening_details = JSON.stringify(screeningResult);

    // Sync extracted skills if candidate skills are empty
    if (
      (!candidate.skills || candidate.skills.trim().length === 0) &&
      screeningResult.matched_skills?.length > 0
    ) {
      candidate.skills = screeningResult.matched_skills.join(', ');
    }

    await this.candidateRepository.save(candidate);
    CandidatesService.invalidateCache();

    return {
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      job_id: candidate.job.id,
      job_title: candidate.job.title,
      ...screeningResult,
    };
  }

  /**
   * Extracts text from resume URL, data URL, or local file.
   */
  private async extractResumeText(resumeUrl: string): Promise<string> {
    try {
      const url = resumeUrl.trim();

      // Base64 Data URL
      if (url.startsWith('data:')) {
        const commaIdx = url.indexOf(',');
        if (commaIdx !== -1) {
          const mimeMatch = url.substring(0, commaIdx).match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const buffer = Buffer.from(url.substring(commaIdx + 1), 'base64');
          if (
            mime.includes('pdf') ||
            mime.includes('word') ||
            mime.includes('officedocument')
          ) {
            const parsed = await this.documentParserService.parseFile({
              originalname: 'resume.pdf',
              mimetype: mime,
              size: buffer.length,
              buffer,
            });
            return parsed.text;
          } else {
            return buffer.toString('utf-8');
          }
        }
      }

      // HTTP / HTTPS URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const ext = path.extname(url).toLowerCase();
            const mime =
              ext === '.docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf';
            const parsed = await this.documentParserService.parseFile({
              originalname: `resume${ext || '.pdf'}`,
              mimetype: mime,
              size: buf.length,
              buffer: buf,
            });
            return parsed.text;
          }
        } catch (fetchErr: any) {
          this.logger.warn(
            `Could not fetch remote resume URL ${url}: ${fetchErr.message}`,
          );
        }
      }

      // Local File
      if (fs.existsSync(url)) {
        const buffer = fs.readFileSync(url);
        const ext = path.extname(url).toLowerCase();
        const mime =
          ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf';
        const parsed = await this.documentParserService.parseFile({
          originalname: path.basename(url),
          mimetype: mime,
          size: buffer.length,
          buffer,
        });
        return parsed.text;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to extract text from resume: ${err.message}`);
    }

    return '';
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
      relations: ['job'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        status: true,
        job_id: true,
        interviewer_email: true,
        interview_date: true,
        interview_time: true,
        gmeet_link: true,
        ai_match_percentage: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
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
      relations: ['job'],
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

      const finalMatchPercentage =
        matchPercentage !== null && matchPercentage !== undefined
          ? matchPercentage
          : c.ai_match_percentage !== null && c.ai_match_percentage !== undefined
          ? Math.round(Number(c.ai_match_percentage))
          : null;

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
              contact_email: c.job.contact_email ?? c.interviewer_email ?? null,
            }
          : null,
        match_percentage: finalMatchPercentage,
        ai_match_percentage: c.ai_match_percentage,
        interviewer_email: c.interviewer_email,
        interview_date: c.interview_date,
        interview_time: c.interview_time,
        gmeet_link: c.gmeet_link,
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
      relations: ['job'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        resume_text: true,
        ai_match_percentage: true,
        ai_screening_details: true,
        interviewer_email: true,
        interview_date: true,
        interview_time: true,
        gmeet_link: true,
        status: true,
        job_id: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
          description: true,
          required_skills: true,
          contact_email: true,
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
      relations: ['job'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        skills: true,
        resume_url: true,
        interviewer_email: true,
        interview_date: true,
        interview_time: true,
        gmeet_link: true,
        ai_match_percentage: true,
        status: true,
        job_id: true,
        created_at: true,
        updated_at: true,
        job: {
          id: true,
          title: true,
          department: true,
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
    const {
      name,
      email,
      phone,
      skills,
      resume_url,
      resume_text,
      ai_match_percentage,
      ai_screening_details,
      interviewer_email,
      interview_date,
      interview_time,
      gmeet_link,
    } = updateCandidateDto;

    let resumeChanged = false;

    if (name !== undefined) existingCandidate.name = name;
    if (email !== undefined) existingCandidate.email = email;
    if (phone !== undefined) existingCandidate.phone = phone;
    if (skills !== undefined) existingCandidate.skills = skills;
    if (resume_url !== undefined && resume_url !== existingCandidate.resume_url) {
      existingCandidate.resume_url = resume_url;
      resumeChanged = true;
    }
    if (resume_text !== undefined && resume_text !== existingCandidate.resume_text) {
      existingCandidate.resume_text = resume_text;
      resumeChanged = true;
    }
    if (ai_match_percentage !== undefined) existingCandidate.ai_match_percentage = ai_match_percentage;
    if (ai_screening_details !== undefined) existingCandidate.ai_screening_details = ai_screening_details;
    if (interviewer_email !== undefined) {
      // RULE: Only allowed to manually set interviewer email if resume matches the JD!
      if (interviewer_email && interviewer_email.trim().length > 0) {
        if (!this.isResumeMatchingJd(existingCandidate)) {
          throw new BadRequestException(
            `Candidate resume does not match the job requirements (Match: ${existingCandidate.ai_match_percentage ?? 0}%). Only matching candidate profiles can move to the technical interview stage and be assigned an interviewer.`,
          );
        }
      }
      existingCandidate.interviewer_email = interviewer_email ? interviewer_email.trim() : null;
    }
    if (interview_date !== undefined) existingCandidate.interview_date = interview_date;
    if (interview_time !== undefined) existingCandidate.interview_time = interview_time;
    if (gmeet_link !== undefined) existingCandidate.gmeet_link = gmeet_link;

    await this.candidateRepository.save(existingCandidate);
    CandidatesService.invalidateCache();

    if (resumeChanged) {
      try {
        await this.screenCandidateResume(id);
      } catch (err: any) {
        this.logger.warn(`Could not re-screen candidate ${id}: ${err.message}`);
      }
    }

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
      relations: ['hr', 'skills'],
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
          interviewer_email:
            evaluation.interviewer_email || candidate.interviewer_email || null,
          created_at: evaluation.created_at,
          updated_at: evaluation.updated_at,
        }
      : null;

    let parsedAiDetails: any = null;
    if (candidate.ai_screening_details) {
      try {
        parsedAiDetails =
          typeof candidate.ai_screening_details === 'string'
            ? JSON.parse(candidate.ai_screening_details)
            : candidate.ai_screening_details;
      } catch (_) {}
    }

    const effectiveMatchPct =
      matchPercentage !== null && matchPercentage !== undefined
        ? matchPercentage
        : candidate.ai_match_percentage !== null &&
          candidate.ai_match_percentage !== undefined
        ? Math.round(Number(candidate.ai_match_percentage))
        : parsedAiDetails?.match_percentage
        ? Math.round(Number(parsedAiDetails.match_percentage))
        : 0;

    const matchingPayload = {
      requiredSkills,
      totalScore,
      maximumScore,
      overallScore,
      matchPercentage: effectiveMatchPct,
      match_percentage: effectiveMatchPct,
      // Skills & AI Analysis
      required_skills: requiredSkills,
      matched_skills: parsedAiDetails?.matched_skills || [],
      missing_skills: parsedAiDetails?.missing_skills || [],
      strengths: parsedAiDetails?.strengths || [],
      recommendation:
        parsedAiDetails?.recommendation ||
        (effectiveMatchPct >= 75
          ? 'STRONG_MATCH'
          : effectiveMatchPct >= 50
          ? 'MODERATE_MATCH'
          : 'POOR_MATCH'),
      summary:
        parsedAiDetails?.summary ||
        `Profile match evaluated at ${effectiveMatchPct}%.`,
    };

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        resume_url: candidate.resume_url,
        resume_text: candidate.resume_text,
        ai_match_percentage: candidate.ai_match_percentage,
        ai_screening_details: parsedAiDetails,
        interviewer_email: candidate.interviewer_email,
        interview_date: candidate.interview_date,
        interview_time: candidate.interview_time,
        gmeet_link: candidate.gmeet_link,
        status: candidate.status,
      },
      job: {
        id: candidate.job?.id ?? candidate.job_id,
        title: candidate.job?.title ?? 'Unknown',
        department: candidate.job?.department ?? '',
        description: candidate.job?.description ?? '',
        required_skills: candidate.job?.required_skills ?? '',
        contact_email:
          candidate.job?.contact_email ?? candidate.interviewer_email ?? null,
      },
      ai_screening: {
        match_percentage: effectiveMatchPct,
        matched_skills: parsedAiDetails?.matched_skills || [],
        missing_skills: parsedAiDetails?.missing_skills || [],
        strengths: parsedAiDetails?.strengths || [],
        recommendation:
          parsedAiDetails?.recommendation ||
          (effectiveMatchPct >= 75
            ? 'STRONG_MATCH'
            : effectiveMatchPct >= 50
            ? 'MODERATE_MATCH'
            : 'POOR_MATCH'),
        summary:
          parsedAiDetails?.summary ||
          `Candidate matches ${effectiveMatchPct}% of the job requirements.`,
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
