import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechLead } from './entities/tech-lead.entity';
import { TechLeadStatus } from './enums/tech-lead-status.enum';
import { CreateTechLeadDto } from './dto/create-tech-lead.dto';
import { UpdateTechLeadDto } from './dto/update-tech-lead.dto';
import { Candidate } from '../candidates/entities/candidate.entity';

@Injectable()
export class TechLeadsService {
  private readonly logger = new Logger(TechLeadsService.name);

  constructor(
    @InjectRepository(TechLead)
    private readonly techLeadRepository: Repository<TechLead>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {}

  /**
   * Create a new Tech Lead (external technical interviewer).
   * Status defaults to ACTIVE.
   */
  async create(createTechLeadDto: CreateTechLeadDto): Promise<TechLead> {
    const normalizedEmail = createTechLeadDto.email.trim().toLowerCase();

    // Check for duplicate email
    const existing = await this.techLeadRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException(
        'A Tech Lead with this email address already exists.',
      );
    }

    const techLead = this.techLeadRepository.create({
      name: createTechLeadDto.name.trim(),
      email: normalizedEmail,
      status: TechLeadStatus.ACTIVE,
    });

    return this.techLeadRepository.save(techLead);
  }

  /**
   * Retrieve all Tech Leads, optionally filtered by status.
   */
  async findAll(status?: TechLeadStatus): Promise<TechLead[]> {
    const whereClause = status ? { status } : {};
    return this.techLeadRepository.find({
      where: whereClause,
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Retrieve only active Tech Leads for candidate dropdown assignment.
   */
  async findActive(): Promise<TechLead[]> {
    return this.techLeadRepository.find({
      where: { status: TechLeadStatus.ACTIVE },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Retrieve a single Tech Lead by ID.
   */
  async findOne(id: number): Promise<TechLead> {
    const techLead = await this.techLeadRepository.findOne({
      where: { id },
    });

    if (!techLead) {
      throw new NotFoundException(`Tech Lead with ID ${id} not found`);
    }

    return techLead;
  }

  /**
   * Update Tech Lead details (name, email, status).
   */
  async update(
    id: number,
    updateTechLeadDto: UpdateTechLeadDto,
  ): Promise<TechLead> {
    const techLead = await this.findOne(id);

    if (updateTechLeadDto.email !== undefined) {
      const normalizedEmail = updateTechLeadDto.email.trim().toLowerCase();
      if (normalizedEmail !== techLead.email.toLowerCase()) {
        const duplicate = await this.techLeadRepository.findOne({
          where: { email: normalizedEmail },
        });

        if (duplicate && duplicate.id !== id) {
          throw new ConflictException(
            'A Tech Lead with this email address already exists.',
          );
        }

        techLead.email = normalizedEmail;
      }
    }

    if (updateTechLeadDto.name !== undefined) {
      techLead.name = updateTechLeadDto.name.trim();
    }

    if (updateTechLeadDto.status !== undefined) {
      techLead.status = updateTechLeadDto.status;
    }

    return this.techLeadRepository.save(techLead);
  }

  /**
   * Delete or deactivate a Tech Lead.
   * If assigned to any candidates, mark as INACTIVE instead of deleting
   * to preserve historical evaluation records.
   */
  async remove(id: number): Promise<{ message: string; status?: TechLeadStatus; id: number }> {
    const techLead = await this.findOne(id);

    // Check if any candidate has been assigned to this Tech Lead
    const candidateCount = await this.candidateRepository.count({
      where: { tech_lead_id: id },
    });

    if (candidateCount > 0) {
      techLead.status = TechLeadStatus.INACTIVE;
      await this.techLeadRepository.save(techLead);
      return {
        message:
          'Tech Lead has candidate assignments and was deactivated (marked INACTIVE) to preserve historical evaluation records.',
        status: TechLeadStatus.INACTIVE,
        id,
      };
    }

    await this.techLeadRepository.delete(id);
    return {
      message: `Tech Lead with ID ${id} has been deleted successfully`,
      id,
    };
  }
}
