import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewEvaluation } from './entities/interview-evaluation.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidateStatus } from '../candidates/enums/candidate-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateInterviewEvaluationDto } from './dto/create-interview-evaluation.dto';
import { UpdateInterviewEvaluationDto } from './dto/update-interview-evaluation.dto';

@Injectable()
export class InterviewEvaluationsService {
  private readonly logger = new Logger(InterviewEvaluationsService.name);

  constructor(
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create or update an interview evaluation.
   * If an evaluation already exists for the candidate, update it instead of creating a duplicate.
   * Updates candidate status to EVALUATED if currently APPLIED.
   */
  async createOrUpdate(
    createDto: CreateInterviewEvaluationDto,
  ): Promise<InterviewEvaluation> {
    const { candidate_id, hr_id, score, notes } = createDto;

    // 1. Verify candidate exists
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidate_id },
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

    // 4. Check whether an evaluation already exists for this candidate
    let evaluation = await this.evaluationRepository.findOne({
      where: { candidate_id },
    });

    if (evaluation) {
      // Update existing evaluation
      this.logger.log(
        `Updating existing evaluation (ID: ${evaluation.id}) for candidate ID ${candidate_id}`,
      );
      evaluation.score = score;
      evaluation.notes = notes;
      evaluation.hr_id = hr_id;
      evaluation.hr = hrUser;
      await this.evaluationRepository.save(evaluation);
    } else {
      // Create new evaluation
      this.logger.log(
        `Creating new interview evaluation for candidate ID ${candidate_id}`,
      );
      evaluation = this.evaluationRepository.create({
        candidate_id,
        hr_id,
        score,
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

    return this.findOne(evaluation.id);
  }

  /**
   * Retrieve all interview evaluations sorted newest first.
   */
  async findAll(): Promise<InterviewEvaluation[]> {
    return this.evaluationRepository.find({
      relations: ['candidate', 'hr'],
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
      relations: ['candidate', 'hr'],
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
      relations: ['candidate', 'hr'],
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
   * Does NOT allow updating candidate_id or hr_id.
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

    await this.evaluationRepository.delete(id);

    return {
      message: `Interview evaluation with ID ${id} has been deleted successfully`,
      id,
    };
  }
}
