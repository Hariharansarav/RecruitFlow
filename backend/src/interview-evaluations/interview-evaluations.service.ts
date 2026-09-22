import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewEvaluation } from './entities/interview-evaluation.entity';
import { InterviewEvaluationSkill } from './entities/interview-evaluation-skill.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidateStatus } from '../candidates/enums/candidate-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateInterviewEvaluationDto } from './dto/create-interview-evaluation.dto';
import { UpdateInterviewEvaluationDto } from './dto/update-interview-evaluation.dto';
import { SubmitTechLeadEvaluationDto } from './dto/submit-tech-lead-evaluation.dto';
import { CandidatesService } from '../candidates/candidates.service';
import { InterviewInvitation } from '../interview-invitations/entities/interview-invitation.entity';
import { InvitationStatus } from '../interview-invitations/enums/invitation-status.enum';

@Injectable()
export class InterviewEvaluationsService {
  private readonly logger = new Logger(InterviewEvaluationsService.name);

  constructor(
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    @InjectRepository(InterviewEvaluationSkill)
    private readonly skillRepository: Repository<InterviewEvaluationSkill>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(InterviewInvitation)
    private readonly invitationRepository: Repository<InterviewInvitation>,
  ) {}

  /**
   * Normalize required skills from Job JD:
   * Splits by comma, trims whitespace, removes empty values,
   * deduplicates case-insensitively, and preserves clean display casing.
   *
   * Example: "React, JavaScript, React,  Node.js, javascript, SQL"
   * Result:  ["React", "JavaScript", "Node.js", "SQL"]
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
   * Helper to format evaluation response object into structured data.
   */
  formatEvaluationResponse(evaluation: any) {
    if (!evaluation) return null;

    const candidate = evaluation.candidate;
    const job = candidate?.job;
    const requiredSkills = this.normalizeSkills(job?.required_skills);
    const maxScore = requiredSkills.length * 5;
    const overallScore =
      evaluation.score !== null && evaluation.score !== undefined
        ? Number(evaluation.score)
        : 0;

    const jdMatch =
      evaluation.jd_match_percentage !== null &&
      evaluation.jd_match_percentage !== undefined
        ? Number(evaluation.jd_match_percentage)
        : maxScore > 0
        ? Math.round(((overallScore * requiredSkills.length) / maxScore) * 10000) / 100
        : 0;

    const skills = (evaluation.skills || []).map((s: any) => ({
      id: s.id,
      skill: s.skill,
      score: Number(s.score),
    }));

    const totalScore = skills.reduce((sum: number, s: any) => sum + s.score, 0);

    return {
      id: evaluation.id,
      candidate_id: evaluation.candidate_id,
      candidate: candidate
        ? {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            resume_url: candidate.resume_url,
            status: candidate.status,
          }
        : null,
      job: job
        ? {
            id: job.id,
            title: job.title,
            department: job.department,
            required_skills: requiredSkills,
          }
        : null,
      skills,
      overall_score: overallScore,
      score: overallScore,
      jd_match_percentage: jdMatch,
      total_score: totalScore,
      max_score: maxScore,
      notes: evaluation.notes,
      hr: evaluation.hr
        ? {
            id: evaluation.hr.id,
            name: evaluation.hr.name,
            email: evaluation.hr.email,
          }
        : null,
      interviewer_email:
        evaluation.interviewer_email || candidate?.interviewer_email || null,
      created_at: evaluation.created_at,
      updated_at: evaluation.updated_at,
    };
  }

  /**
   * Create or update an interview evaluation.
   * Enforces that Job JD is the single source of truth for technical evaluation skills.
   * Calculates overall score (/5) and JD match percentage.
   */
  async createOrUpdate(
    createDto: CreateInterviewEvaluationDto,
  ): Promise<any> {
    const { candidate_id, hr_id, notes, skills } = createDto;

    // 1. Verify candidate exists and load assigned job
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidate_id },
      relations: ['job'],
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidate_id} not found`);
    }

    // 2. Resolve and verify HR user
    let hrUser: User | null = null;
    if (hr_id) {
      hrUser = await this.userRepository.findOne({
        where: { id: hr_id },
      });
      if (!hrUser) {
        throw new NotFoundException(`HR user with ID ${hr_id} not found`);
      }
      if (hrUser.role !== UserRole.HR) {
        throw new ForbiddenException(
          `Only HR users are permitted to evaluate candidates. User '${hrUser.name}' has role '${hrUser.role}'`,
        );
      }
    } else {
      // Find default HR user
      hrUser = await this.userRepository.findOne({
        where: { role: UserRole.HR },
      });
      if (!hrUser) {
        throw new NotFoundException('No HR user found to assign this evaluation.');
      }
    }

    // 3. Verify candidate has an assigned job
    if (!candidate.job) {
      throw new BadRequestException(
        'Candidate must be assigned to an open job before evaluation.',
      );
    }

    // 4. Extract and normalize required skills from Job JD
    const requiredSkills = this.normalizeSkills(candidate.job.required_skills);
    if (requiredSkills.length === 0) {
      throw new BadRequestException(
        'This job has no required skills configured for evaluation.',
      );
    }

    // Build lookup maps for required skills
    const requiredSkillsLowerMap = new Map<string, string>();
    for (const rs of requiredSkills) {
      requiredSkillsLowerMap.set(rs.toLowerCase(), rs);
    }

    // 5. Verify submitted skills array is provided
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      throw new BadRequestException(
        'Please provide scores for all required skills.',
      );
    }

    // 6. Validate submitted skills: check duplicates, valid scores (0-5), and unknown skills
    const seenSubmittedSkills = new Set<string>();
    const skillScoreMap = new Map<string, number>();

    for (const item of skills) {
      const trimmedSkill = (item.skill || '').trim();
      if (!trimmedSkill) {
        throw new BadRequestException('Skill name cannot be empty.');
      }

      const lowerKey = trimmedSkill.toLowerCase();

      // Check duplicate skill in submission
      if (seenSubmittedSkills.has(lowerKey)) {
        throw new BadRequestException(
          `Duplicate skill '${trimmedSkill}' submitted.`,
        );
      }
      seenSubmittedSkills.add(lowerKey);

      // Check score range: must be between 0 and 5 (0 is valid!)
      const scoreNum = Number(item.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 5) {
        throw new BadRequestException(
          `Skill score for '${trimmedSkill}' must be between 0 and 5.`,
        );
      }

      // Check that skill is in Job JD
      if (!requiredSkillsLowerMap.has(lowerKey)) {
        throw new BadRequestException(
          `Skill '${trimmedSkill}' is not a required skill for this job.`,
        );
      }

      skillScoreMap.set(lowerKey, scoreNum);
    }

    // 7. Ensure every required skill from Job JD is evaluated
    for (const rs of requiredSkills) {
      if (!skillScoreMap.has(rs.toLowerCase())) {
        throw new BadRequestException(
          'Please provide scores for all required skills.',
        );
      }
    }

    // 8. Calculate authoritative scores
    // total_score = sum of all skill scores
    // maximum_score = number_of_required_skills * 5
    // overall_score = total_score / number_of_required_skills (rounded to 2 decimal places)
    // jd_match_percentage = (total_score / maximum_score) * 100 (rounded to 2 decimal places)
    const totalScore = requiredSkills.reduce(
      (sum, rs) => sum + (skillScoreMap.get(rs.toLowerCase()) ?? 0),
      0,
    );
    const maximumScore = requiredSkills.length * 5;
    const overallScore =
      Math.round((totalScore / requiredSkills.length) * 100) / 100;
    const jdMatchPercentage =
      maximumScore > 0
        ? Math.round(((totalScore / maximumScore) * 100) * 100) / 100
        : 0;

    // 9. Save or update evaluation
    let evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id },
    });

    if (evaluation) {
      this.logger.log(
        `Updating existing evaluation (ID: ${evaluation.id}) for candidate ID ${candidate_id}`,
      );
      evaluation.score = overallScore;
      evaluation.jd_match_percentage = jdMatchPercentage;
      evaluation.notes = notes.trim();
      evaluation.hr_id = hrUser.id;
      evaluation.hr = hrUser;
      await this.evaluationRepository.save(evaluation);

      // Clean up previous individual skill records
      await this.skillRepository.delete({ evaluation_id: evaluation.id });
    } else {
      this.logger.log(
        `Creating new interview evaluation for candidate ID ${candidate_id}`,
      );
      evaluation = this.evaluationRepository.create({
        candidate_id,
        hr_id: hrUser.id,
        score: overallScore,
        jd_match_percentage: jdMatchPercentage,
        notes: notes.trim(),
        candidate,
        hr: hrUser,
      });
      await this.evaluationRepository.save(evaluation);

      // Transition candidate status from APPLIED to EVALUATED on first evaluation
      if (candidate.status === CandidateStatus.APPLIED) {
        candidate.status = CandidateStatus.EVALUATED;
        await this.candidateRepository.save(candidate);
        this.logger.log(
          `Candidate ID ${candidate.id} status updated from APPLIED to EVALUATED`,
        );
      }
    }

    // 10. Save individual skill records using canonical required skill names
    const skillEntities = requiredSkills.map((rs) => {
      const scoreVal = skillScoreMap.get(rs.toLowerCase()) ?? 0;
      return this.skillRepository.create({
        evaluation_id: evaluation.id,
        skill: rs,
        score: Number(scoreVal),
      });
    });

    await this.skillRepository.save(skillEntities);

    CandidatesService.invalidateCache();
    return this.findOne(evaluation.id);
  }

  /**
   * Retrieve all interview evaluations sorted newest first.
   */
  async findAll(): Promise<any[]> {
    const evaluations = await this.evaluationRepository.find({
      relations: ['candidate', 'candidate.job', 'hr', 'skills'],
      order: {
        created_at: 'DESC',
      },
    });

    return evaluations.map((e) => this.formatEvaluationResponse(e));
  }

  /**
   * Retrieve a single interview evaluation by its ID.
   */
  async findOne(id: number): Promise<any> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: ['candidate', 'candidate.job', 'hr', 'skills'],
    });

    if (!evaluation) {
      throw new NotFoundException(`Interview evaluation with ID ${id} not found`);
    }

    return this.formatEvaluationResponse(evaluation);
  }

  /**
   * Retrieve the evaluation for a specific candidate.
   */
  async findByCandidateId(candidateId: number): Promise<any> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: candidateId },
      relations: ['candidate', 'candidate.job', 'hr', 'skills'],
    });

    if (!evaluation) {
      throw new NotFoundException(
        `No interview evaluation found for candidate with ID ${candidateId}`,
      );
    }

    return this.formatEvaluationResponse(evaluation);
  }

  /**
   * Update score, skills, and notes of an existing evaluation.
   */
  async update(
    id: number,
    updateDto: UpdateInterviewEvaluationDto,
  ): Promise<any> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: ['candidate', 'candidate.job', 'skills'],
    });

    if (!evaluation) {
      throw new NotFoundException(`Interview evaluation with ID ${id} not found`);
    }

    const { notes, skills } = updateDto;

    if (notes !== undefined) {
      evaluation.notes = notes.trim();
    }

    if (skills && Array.isArray(skills) && skills.length > 0) {
      const candidate = evaluation.candidate;
      if (!candidate || !candidate.job) {
        throw new BadRequestException('Candidate or assigned job not found.');
      }

      const requiredSkills = this.normalizeSkills(candidate.job.required_skills);
      if (requiredSkills.length === 0) {
        throw new BadRequestException(
          'This job has no required skills configured for evaluation.',
        );
      }

      const requiredSkillsLowerMap = new Map<string, string>();
      for (const rs of requiredSkills) {
        requiredSkillsLowerMap.set(rs.toLowerCase(), rs);
      }

      const seenSubmittedSkills = new Set<string>();
      const skillScoreMap = new Map<string, number>();

      for (const item of skills) {
        const trimmedSkill = (item.skill || '').trim();
        const lowerKey = trimmedSkill.toLowerCase();

        if (seenSubmittedSkills.has(lowerKey)) {
          throw new BadRequestException(
            `Duplicate skill '${trimmedSkill}' submitted.`,
          );
        }
        seenSubmittedSkills.add(lowerKey);

        const scoreNum = Number(item.score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 5) {
          throw new BadRequestException(
            `Skill score for '${trimmedSkill}' must be between 0 and 5.`,
          );
        }

        if (!requiredSkillsLowerMap.has(lowerKey)) {
          throw new BadRequestException(
            `Skill '${trimmedSkill}' is not a required skill for this job.`,
          );
        }

        skillScoreMap.set(lowerKey, scoreNum);
      }

      for (const rs of requiredSkills) {
        if (!skillScoreMap.has(rs.toLowerCase())) {
          throw new BadRequestException(
            'Please provide scores for all required skills.',
          );
        }
      }

      const totalScore = requiredSkills.reduce(
        (sum, rs) => sum + (skillScoreMap.get(rs.toLowerCase()) ?? 0),
        0,
      );
      const maximumScore = requiredSkills.length * 5;
      const overallScore =
        Math.round((totalScore / requiredSkills.length) * 100) / 100;
      const jdMatchPercentage =
        maximumScore > 0
          ? Math.round(((totalScore / maximumScore) * 100) * 100) / 100
          : 0;

      evaluation.score = overallScore;
      evaluation.jd_match_percentage = jdMatchPercentage;

      await this.skillRepository.delete({ evaluation_id: id });

      const skillEntities = requiredSkills.map((rs) => {
        const scoreVal = skillScoreMap.get(rs.toLowerCase()) ?? 0;
        return this.skillRepository.create({
          evaluation_id: id,
          skill: rs,
          score: Number(scoreVal),
        });
      });

      await this.skillRepository.save(skillEntities);
    }

    await this.evaluationRepository.save(evaluation);
    CandidatesService.invalidateCache();

    return this.findOne(id);
  }

  /**
   * Delete an evaluation by ID.
   */
  async remove(id: number): Promise<{ message: string; id: number }> {
    await this.findOne(id);

    await this.skillRepository.delete({ evaluation_id: id });
    await this.evaluationRepository.delete(id);
    CandidatesService.invalidateCache();

    return {
      message: `Interview evaluation with ID ${id} has been deleted successfully`,
      id,
    };
  }

  /**
   * Submit an evaluation by the Tech Lead using the secure invitation token.
   * Validates token, candidate, job required skills, computes overall score & JD match %,
   * saves evaluation and skills, marks invitation COMPLETED, sets candidate status EVALUATED,
   * and invalidates screening cache.
   */
  async submitTechLeadEvaluation(
    token: string,
    dto: SubmitTechLeadEvaluationDto,
  ): Promise<any> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Evaluation token is required.');
    }

    // 1. Find invitation by token
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['candidate', 'candidate.job'],
    });

    if (!invitation) {
      throw new NotFoundException('Interview invitation not found or link is invalid.');
    }

    // 2. Check invitation status
    if (invitation.status === InvitationStatus.COMPLETED) {
      throw new BadRequestException('This interview evaluation has already been submitted.');
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      throw new BadRequestException('This interview invitation has been cancelled. Please contact HR.');
    }

    // 3. Check expiration
    if (new Date(invitation.expires_at) <= new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException(
        'This interview invitation link has expired. Please contact HR for a new link.',
      );
    }

    const candidate = invitation.candidate;
    if (!candidate) {
      throw new NotFoundException('Candidate associated with this invitation was not found.');
    }

    const job = candidate.job;
    if (!job) {
      throw new BadRequestException('Candidate has no assigned job position.');
    }

    // 4. Validate skills against job required_skills
    const requiredSkills = this.normalizeSkills(job.required_skills);
    if (requiredSkills.length === 0) {
      throw new BadRequestException('Assigned job position has no required technical skills configured.');
    }

    if (!dto.skills || !Array.isArray(dto.skills) || dto.skills.length === 0) {
      throw new BadRequestException('Evaluation skill ratings are required.');
    }

    const requiredSkillMap = new Map<string, string>();
    for (const rSkill of requiredSkills) {
      requiredSkillMap.set(rSkill.toLowerCase(), rSkill);
    }

    const providedSkillMap = new Map<string, number>();
    for (const s of dto.skills) {
      const lower = (s.skill || '').trim().toLowerCase();
      if (!lower) {
        throw new BadRequestException('Skill name cannot be empty.');
      }
      if (!requiredSkillMap.has(lower)) {
        throw new BadRequestException(
          `Skill '${s.skill}' is not among the required skills for ${job.title}.`,
        );
      }
      const scoreNum = Number(s.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 5) {
        throw new BadRequestException(
          `Skill score for '${s.skill}' must be a number between 0 and 5.`,
        );
      }
      providedSkillMap.set(lower, scoreNum);
    }

    // Verify all required skills are scored
    const missingSkills: string[] = [];
    for (const [rLower, rName] of requiredSkillMap.entries()) {
      if (!providedSkillMap.has(rLower)) {
        missingSkills.push(rName);
      }
    }
    if (missingSkills.length > 0) {
      throw new BadRequestException(
        `All required skills must be evaluated. Missing skills: ${missingSkills.join(', ')}`,
      );
    }

    // 5. Calculate overall score (average of required skills) & JD match %
    const totalScore = Array.from(providedSkillMap.values()).reduce(
      (sum, sc) => sum + sc,
      0,
    );
    const maxScore = requiredSkills.length * 5;
    const overallScore =
      Math.round((totalScore / requiredSkills.length) * 100) / 100;
    const jdMatchPercentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;

    // 6. Find or create InterviewEvaluation
    let evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: candidate.id },
      relations: ['skills'],
    });

    if (evaluation) {
      // Remove previous skill scores if any
      if (evaluation.skills && evaluation.skills.length > 0) {
        await this.skillRepository.remove(evaluation.skills);
      }
      evaluation.score = overallScore;
      evaluation.jd_match_percentage = jdMatchPercentage;
      evaluation.notes = dto.notes.trim();
      evaluation.interviewer_email = invitation.interviewer_email;
    } else {
      evaluation = this.evaluationRepository.create({
        candidate_id: candidate.id,
        candidate,
        interviewer_email: invitation.interviewer_email,
        score: overallScore,
        jd_match_percentage: jdMatchPercentage,
        notes: dto.notes.trim(),
      });
    }

    const savedEvaluation = await this.evaluationRepository.save(evaluation);

    // 7. Save individual skill evaluations
    const skillEntities = Array.from(providedSkillMap.entries()).map(
      ([lower, score]) =>
        this.skillRepository.create({
          evaluation_id: savedEvaluation.id,
          evaluation: savedEvaluation,
          skill: requiredSkillMap.get(lower) || lower,
          score,
        }),
    );
    await this.skillRepository.save(skillEntities);

    // 8. Update invitation to COMPLETED
    invitation.status = InvitationStatus.COMPLETED;
    invitation.completed_at = new Date();
    await this.invitationRepository.save(invitation);

    // 9. Update candidate status to EVALUATED
    candidate.status = CandidateStatus.EVALUATED;
    await this.candidateRepository.save(candidate);

    // 10. Invalidate candidate screening cache
    CandidatesService.invalidateCache();

    this.logger.log(
      `Interviewer ${invitation.interviewer_email} submitted evaluation for candidate ${candidate.id}. Overall score: ${overallScore}/5, JD match: ${jdMatchPercentage}%`,
    );

    // 11. Return detailed formatted evaluation
    const completeEvaluation = await this.evaluationRepository.findOne({
      where: { id: savedEvaluation.id },
      relations: ['skills', 'candidate', 'candidate.job'],
    });

    return this.formatEvaluationResponse(completeEvaluation);
  }

  /**
   * Retrieve evaluation data or candidate evaluation requirements using secure token.
   */
  async getEvaluationByToken(token: string): Promise<any> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['candidate', 'candidate.job'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or unknown evaluation token.');
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      throw new BadRequestException('This interview evaluation link has been cancelled.');
    }

    if (new Date(invitation.expires_at) <= new Date() && invitation.status === InvitationStatus.PENDING) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('This interview evaluation link has expired.');
    }

    const candidate = invitation.candidate;
    const job = candidate?.job;
    const requiredSkills = this.normalizeSkills(job?.required_skills);

    const existingEval = await this.evaluationRepository.findOne({
      where: { candidate_id: candidate?.id },
      relations: ['skills', 'candidate', 'candidate.job'],
    });

    return {
      invitation_id: invitation.id,
      token: invitation.token,
      status: invitation.status,
      is_completed: invitation.status === InvitationStatus.COMPLETED,
      candidate: candidate
        ? {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            resume_url: candidate.resume_url,
          }
        : null,
      job: job
        ? {
            id: job.id,
            title: job.title,
            department: job.department,
            required_skills: requiredSkills,
          }
        : null,
      interviewer_email: invitation.interviewer_email,
      interviewer_name: invitation.interviewer_name,
      evaluation: existingEval ? this.formatEvaluationResponse(existingEval) : null,
      expires_at: invitation.expires_at,
      completed_at: invitation.completed_at,
    };
  }
}
