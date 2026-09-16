import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

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
      throw new NotFoundException(`Job with ID ${job_id} not found`);
    }

    // 2. Verify that the job is OPEN
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException(
        `Cannot add candidates to a closed job. Job '${job.title}' (ID: ${job.id}) has status '${job.status}'`,
      );
    }

    // 3. Create candidate with status APPLIED
    const candidate = this.candidateRepository.create({
      name,
      email,
      phone,
      resume_url,
      status: CandidateStatus.APPLIED,
      job_id: job.id,
      job,
    });

    const savedCandidate = await this.candidateRepository.save(candidate);

    // Return candidate with basic job info
    return this.findOne(savedCandidate.id);
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
        resume_url: true,
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
        resume_url: true,
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
        resume_url: true,
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
  ): Promise<Candidate> {
    // 1. Verify candidate exists
    const existingCandidate = await this.findOne(id);

    // 2. Merge allowed fields
    const { name, email, phone, resume_url, status } = updateCandidateDto;

    if (name !== undefined) existingCandidate.name = name;
    if (email !== undefined) existingCandidate.email = email;
    if (phone !== undefined) existingCandidate.phone = phone;
    if (resume_url !== undefined) existingCandidate.resume_url = resume_url;
    if (status !== undefined) existingCandidate.status = status;

    await this.candidateRepository.save(existingCandidate);

    return this.findOne(id);
  }

  /**
   * Delete a candidate by ID.
   */
  async remove(id: number): Promise<{ message: string; id: number }> {
    // 1. Verify candidate exists
    await this.findOne(id);

    // 2. Delete
    await this.candidateRepository.delete(id);

    return {
      message: `Candidate with ID ${id} has been deleted successfully`,
      id,
    };
  }
}
