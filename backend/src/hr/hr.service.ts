import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../jobs/enums/job-status.enum';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidateStatus } from '../candidates/enums/candidate-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

export interface HrDashboardStats {
  open_jobs: number;
  total_candidates: number;
  evaluated_candidates: number;
  submitted_candidates: number;
  accepted_candidates: number;
  rejected_candidates: number;
}

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Validate that the requesting user exists and possesses the HR role.
   * Throws 400 if hrId is missing, 404 if user doesn't exist, 403 if user is not HR.
   */
  async validateHrUser(hrId?: number): Promise<User> {
    if (hrId === undefined || hrId === null || isNaN(hrId)) {
      throw new BadRequestException('hr_id query parameter is required');
    }

    const user = await this.userRepository.findOne({
      where: { id: hrId },
    });

    if (!user) {
      throw new NotFoundException(`HR user with ID ${hrId} not found`);
    }

    if (user.role !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to access HR dashboard statistics. User '${user.name}' has role '${user.role}'`,
      );
    }

    return user;
  }

  /**
   * Calculate live recruitment statistics from the database.
   */
  async getDashboardStats(hrId?: number): Promise<HrDashboardStats> {
    await this.validateHrUser(hrId);

    // 1. Open jobs (only status = OPEN, exclude CLOSED)
    const openJobsCount = await this.jobRepository.count({
      where: { status: JobStatus.OPEN },
    });

    // 2. Total candidates
    const totalCandidatesCount = await this.candidateRepository.count();

    // 3. Evaluated candidates
    const evaluatedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.EVALUATED },
    });

    // 4. Submitted to company
    const submittedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.SUBMITTED_TO_COMPANY },
    });

    // 5. Accepted candidates
    const acceptedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.ACCEPTED },
    });

    // 6. Rejected candidates
    const rejectedCount = await this.candidateRepository.count({
      where: { status: CandidateStatus.REJECTED },
    });

    this.logger.log(
      `Calculated HR dashboard stats for HR user ID ${hrId}: open_jobs=${openJobsCount}, total_candidates=${totalCandidatesCount}`,
    );

    return {
      open_jobs: openJobsCount,
      total_candidates: totalCandidatesCount,
      evaluated_candidates: evaluatedCount,
      submitted_candidates: submittedCount,
      accepted_candidates: acceptedCount,
      rejected_candidates: rejectedCount,
    };
  }
}
