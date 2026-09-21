import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {}

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
   * Create a new job.
   * Only users with the HR role can create jobs.
   */
  async create(createJobDto: CreateJobDto): Promise<Job> {
    const { created_by } = createJobDto;

    // 1. Verify that the user exists
    const user = await this.userRepository.findOne({
      where: { id: created_by },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${created_by} not found`);
    }

    // 2. Verify that the user has the HR role
    if (user.role !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to create jobs. User '${user.name}' has role '${user.role}'`,
      );
    }

    // 3. Create and save the job
    const job = this.jobRepository.create({
      ...createJobDto,
      created_by: user.id,
      creator: user,
    });

    const savedJob = await this.jobRepository.save(job);

    // Return the created job with creator details (password is excluded)
    return this.findOne(savedJob.id);
  }

  /**
   * Get all jobs sorted by newest first with creator info.
   */
  async findAll(): Promise<Job[]> {
    return this.jobRepository.find({
      relations: ['creator'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Get a single job by ID with creator info.
   */
  async findOne(id: number): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Update a job by ID.
   * Cannot change created_by.
   */
  async update(
    id: number,
    updateJobDto: UpdateJobDto,
    hrId?: number,
  ): Promise<Job> {
    // 1. Verify HR user if provided
    await this.validateHrUser(hrId);

    // 2. Check if the job exists
    const existingJob = await this.findOne(id);

    // 3. Merge allowed updates (created_by is not included in UpdateJobDto)
    const { title, department, description, required_skills, experience_required, location, status, contact_email } = updateJobDto;

    if (title !== undefined) existingJob.title = title;
    if (department !== undefined) existingJob.department = department;
    if (description !== undefined) existingJob.description = description;
    if (required_skills !== undefined) existingJob.required_skills = required_skills;
    if (experience_required !== undefined) existingJob.experience_required = experience_required;
    if (location !== undefined) existingJob.location = location;
    if (status !== undefined) existingJob.status = status;
    if (contact_email !== undefined) existingJob.contact_email = contact_email;

    await this.jobRepository.save(existingJob);

    // Return the updated job with creator details
    return this.findOne(id);
  }

  /**
   * Delete a job by ID.
   * Enforces that HR role is verified if hrId is provided,
   * and prevents deletion if any candidates are associated with this job.
   */
  async remove(id: number, hrId?: number): Promise<{ message: string; id: number }> {
    // 1. Verify HR user if provided
    await this.validateHrUser(hrId);

    // 2. Verify job existence
    await this.findOne(id);

    // 3. Check for associated candidates
    const candidateCount = await this.candidateRepository.count({
      where: { job_id: id },
    });

    if (candidateCount > 0) {
      throw new BadRequestException(
        'This job cannot be deleted because candidates are associated with it.',
      );
    }

    // 4. Perform delete
    await this.jobRepository.delete(id);

    return {
      message: `Job with ID ${id} has been deleted successfully`,
      id,
    };
  }
}
