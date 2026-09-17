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
import { CandidatesService } from '../candidates/candidates.service';

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
  ) {}

  /**
   * Normalize required skills from Job JD:
   * Splits by comma, trims, deduplicates case-insensitively, preserves original display casing.
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
   * Create or update an interview evaluation.
   * Enforces that Job JD is the source of skills.
   * Recalculates total score, overall score / 5, and saves individual skill scores.
   * Updates candidate status to EVALUATED if currently APPLIED.
   */
  async createOrUpdate(
    createDto: CreateInterviewEvaluationDto,
  ): Promise<InterviewEvaluation> {
    const { candidate_id, hr_id, notes, skills } = createDto;

    // 1. Verify candidate exists and load assigned job
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidate_id },
      relations: ['job'],
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidate_id} not found`);
    }

    // 2. Verify HR user exists
    const hrUser = await this.userRepository.findOne({
      where: { id: hr_id },
    });
    if (!hrUser) {
      throw new NotFoundException(`HR user with ID ${hr_id} not found`);
    }

    // 3. Verify user has HR role
    if (hrUser.role !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to evaluate candidates. User '${hrUser.name}' has role '${hrUser.role}'`,
      );
    }

    // 4. Verify candidate has an assigned job
    if (!candidate.job) {
      throw new BadRequestException(
        'Candidate must be assigned to an open job before evaluation.',
      );
    }

    // 5. Extract and normalize required skills from Job JD
    const requiredSkills = this.normalizeSkills(candidate.job.required_skills);
    if (requiredSkills.length === 0) {
      throw new BadRequestException(
        'This job has no required skills configured. Please update the job description before evaluating this candidate.',
      );
    }

    // 6. Validate skill-level scores
    let finalScore: number;

    if (skills && Array.isArray(skills) && skills.length > 0) {
      const skillScoreMap = new Map<string, number>();

      for (const item of skills) {
        const key = (item.skill || '').trim().toLowerCase();
        const scoreNum = Number(item.score);

        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 5) {
          throw new BadRequestException(
            `Skill score for '${item.skill}' must be between 0 and 5.`,
          );
        }

        skillScoreMap.set(key, scoreNum);
      }

      // Ensure every required skill from Job JD is evaluated
      const missingSkills = requiredSkills.filter(
        (rs) => !skillScoreMap.has(rs.toLowerCase()),
      );

      if (missingSkills.length > 0) {
        throw new BadRequestException(
          'Please evaluate all required skills before saving.',
        );
      }

      // Backend calculation
      const totalScore = requiredSkills.reduce(
        (sum, rs) => sum + (skillScoreMap.get(rs.toLowerCase()) ?? 0),
        0,
      );
      const overallScore =
        Math.round((totalScore / requiredSkills.length) * 100) / 100;
      finalScore = overallScore;
    } else if (createDto.score !== undefined && createDto.score !== null) {
      const s = Number(createDto.score);
      if (isNaN(s) || s < 0 || s > 5) {
        throw new BadRequestException('Overall score must be between 0 and 5.');
      }
      finalScore = s;
    } else {
      throw new BadRequestException(
        'Please evaluate all required skills before saving.',
      );
    }

    // 7. Check whether an evaluation already exists for this candidate
    let evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id },
    });

    if (evaluation) {
      // Update existing evaluation
      this.logger.log(
        `Updating existing evaluation (ID: ${evaluation.id}) for candidate ID ${candidate_id}`,
      );
      evaluation.score = finalScore;
      evaluation.notes = notes;
      evaluation.hr_id = hr_id;
      evaluation.hr = hrUser;
      await this.evaluationRepository.save(evaluation);

      // Clean up previous individual skill records
      await this.skillRepository.delete({ evaluation_id: evaluation.id });
    } else {
      // Create new evaluation
      this.logger.log(
        `Creating new interview evaluation for candidate ID ${candidate_id}`,
      );
      evaluation = this.evaluationRepository.create({
        candidate_id,
        hr_id,
        score: finalScore,
        notes,
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

    // 8. Save new individual skill records if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      const skillEntities = requiredSkills.map((rs) => {
        const lowerKey = rs.toLowerCase();
        const scoreVal =
          skills.find(
            (s) => (s.skill || '').trim().toLowerCase() === lowerKey,
          )?.score ?? 0;

        return this.skillRepository.create({
          evaluation_id: evaluation.id,
          skill: rs,
          score: Number(scoreVal),
        });
      });

      await this.skillRepository.save(skillEntities);
    }

    CandidatesService.invalidateCache();
    return this.findOne(evaluation.id);
  }

  /**
   * Retrieve all interview evaluations sorted newest first, including individual skill scores.
   */
  async findAll(): Promise<InterviewEvaluation[]> {
    return this.evaluationRepository.find({
      relations: ['candidate', 'hr', 'skills'],
      select: {
        id: true,
        candidate_id: true,
        hr_id: true,
        score: true,
        notes: true,
        created_at: true,
        updated_at: true,
        candidate: {
          id: true,
          name: true,
          email: true,
        },
        hr: {
          id: true,
          name: true,
          email: true,
        },
        skills: {
          id: true,
          skill: true,
          score: true,
        },
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Retrieve a single interview evaluation by its ID.
   */
  async findOne(id: number): Promise<InterviewEvaluation> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: ['candidate', 'hr', 'skills'],
      select: {
        id: true,
        candidate_id: true,
        hr_id: true,
        score: true,
        notes: true,
        created_at: true,
        updated_at: true,
        candidate: {
          id: true,
          name: true,
          email: true,
        },
        hr: {
          id: true,
          name: true,
          email: true,
        },
        skills: {
          id: true,
          skill: true,
          score: true,
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Interview evaluation with ID ${id} not found`);
    }

    return evaluation;
  }

  /**
   * Retrieve the evaluation for a specific candidate.
   */
  async findByCandidateId(candidateId: number): Promise<InterviewEvaluation> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id: candidateId },
      relations: ['candidate', 'hr', 'skills'],
      select: {
        id: true,
        candidate_id: true,
        hr_id: true,
        score: true,
        notes: true,
        created_at: true,
        updated_at: true,
        candidate: {
          id: true,
          name: true,
          email: true,
        },
        hr: {
          id: true,
          name: true,
          email: true,
        },
        skills: {
          id: true,
          skill: true,
          score: true,
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(
        `No interview evaluation found for candidate with ID ${candidateId}`,
      );
    }

    return evaluation;
  }

  /**
   * Update score and notes of an evaluation.
   */
  async update(
    id: number,
    updateDto: UpdateInterviewEvaluationDto,
  ): Promise<InterviewEvaluation> {
    const evaluation = await this.findOne(id);

    const { score, notes } = updateDto;
    if (score !== undefined) evaluation.score = score;
    if (notes !== undefined) evaluation.notes = notes;

    await this.evaluationRepository.save(evaluation);

    return this.findOne(id);
  }

  /**
   * Delete an evaluation by ID.
   */
  async remove(id: number): Promise<{ message: string; id: number }> {
    await this.findOne(id);

    await this.skillRepository.delete({ evaluation_id: id });
    await this.evaluationRepository.delete(id);

    return {
      message: `Interview evaluation with ID ${id} has been deleted successfully`,
      id,
    };
  }
}
