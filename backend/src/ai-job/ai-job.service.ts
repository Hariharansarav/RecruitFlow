import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { GroqService } from './groq.service';
import { DocumentParserService, UploadedFileDto } from './document-parser.service';
import { GenerateJobDto } from './dto/generate-job.dto';
import { ParseJdDto } from './dto/parse-jd.dto';
import { buildGenerateJobPrompt } from './prompts/generate-job.prompt';
import { buildParseJdPrompt } from './prompts/parse-jd.prompt';
import {
  StructuredJobApiResponse,
  StructuredJobData,
} from './schemas/job-generation.schema';

@Injectable()
export class AiJobService {
  private readonly logger = new Logger(AiJobService.name);

  constructor(
    private readonly groqService: GroqService,
    private readonly documentParserService: DocumentParserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Validate that the requesting user is an authorized HR user.
   * Matches the existing authorization patterns in JobsService, CandidatesService, and HrService.
   */
  async validateHrUser(
    hrId?: number,
    roleHeader?: string,
  ): Promise<User | null> {
    // If a role header is provided and is not HR, immediately reject with 403
    if (roleHeader && roleHeader.toUpperCase() !== UserRole.HR) {
      throw new ForbiddenException(
        `Only HR users are permitted to access AI job intelligence features. Current role: '${roleHeader}'`,
      );
    }

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
   * OPTION 2: Generate a complete structured Job Description from Role + Experience.
   * Does NOT write to the database.
   */
  async generateJob(
    dto: GenerateJobDto,
    hrId?: number,
    roleHeader?: string,
  ): Promise<StructuredJobApiResponse> {
    // 1. Authorize user
    await this.validateHrUser(hrId, roleHeader);

    this.logger.log('[AI JOB] Generation request received');
    this.logger.log(`[AI JOB] Role: ${dto.job_title}`);
    this.logger.log(`[AI JOB] Experience: ${dto.experience_years} years`);

    // 2. Build prompt
    const { systemPrompt, userPrompt } = buildGenerateJobPrompt(dto);

    // 3. Call Groq
    const rawResult = await this.groqService.generateStructuredJob(
      systemPrompt,
      userPrompt,
    );

    // 4. Validate output
    const validatedData = this.validateJobOutput(rawResult, dto.location);

    this.logger.log('[AI JOB] Job data validated');

    return {
      success: true,
      data: validatedData,
    };
  }

  /**
   * OPTION 1: Parse and structure an existing Job Description (plain text or PDF/DOCX).
   * Does NOT write to the database.
   */
  async parseJobDescription(
    dto: ParseJdDto,
    file?: UploadedFileDto,
    hrId?: number,
    roleHeader?: string,
  ): Promise<StructuredJobApiResponse> {
    // 1. Authorize user
    await this.validateHrUser(hrId, roleHeader);

    let extractedText = '';

    // 2. Extract text from file or body
    if (file && file.buffer) {
      this.logger.log(
        `[AI JOB] Parsing uploaded JD document: '${file.originalname}' (${file.mimetype})`,
      );
      const parsedDoc = await this.documentParserService.parseFile(file);
      extractedText = parsedDoc.text;
    } else if (dto.jd_text && dto.jd_text.trim().length > 0) {
      extractedText = dto.jd_text.trim();
      if (extractedText.length < 20) {
        throw new BadRequestException(
          'jd_text is too short. Please provide a substantive Job Description of at least 20 characters.',
        );
      }
    } else {
      throw new BadRequestException(
        'Either a Job Description document (PDF/DOCX) or jd_text must be provided.',
      );
    }

    this.logger.log(
      `[AI JOB] Extracted ${extractedText.length} characters of JD text. Calling AI for structuring.`,
    );

    // 3. Build prompt
    const { systemPrompt, userPrompt } = buildParseJdPrompt(extractedText);

    // 4. Call Groq
    const rawResult = await this.groqService.generateStructuredJob(
      systemPrompt,
      userPrompt,
    );

    // 5. Validate output
    const validatedData = this.validateJobOutput(rawResult);

    this.logger.log('[AI JOB] Job data validated');

    return {
      success: true,
      data: validatedData,
    };
  }

  /**
   * Strictly validates AI response data against the required schema.
   * Normalizes required_skills by removing duplicates case-insensitively and trimming.
   * Ensures no malformed data reaches the frontend.
   */
  validateJobOutput(
    raw: any,
    suppliedLocation?: string,
  ): StructuredJobData {
    if (!raw || typeof raw !== 'object') {
      this.logger.error('[AI JOB] Validation failed: Model returned non-object');
      throw new InternalServerErrorException(
        'AI output validation failed: Invalid model response format.',
      );
    }

    // Validate title (Strict rejection for empty title)
    if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) {
      this.logger.error('[AI JOB] Validation failed: Missing or empty title');
      throw new InternalServerErrorException(
        'AI output validation failed: Missing job title.',
      );
    }
    const title = raw.title.trim();

    // Validate or fallback department
    const department =
      raw.department && typeof raw.department === 'string' && raw.department.trim()
        ? raw.department.trim()
        : 'Engineering';

    // Validate or fallback seniority_level
    const seniority_level =
      raw.seniority_level &&
      typeof raw.seniority_level === 'string' &&
      raw.seniority_level.trim()
        ? raw.seniority_level.trim()
        : 'Mid-Level';

    // Infer experience_required if empty
    let experience_required =
      raw.experience_required &&
      typeof raw.experience_required === 'string' &&
      raw.experience_required.trim()
        ? raw.experience_required.trim()
        : '';

    if (!experience_required) {
      const lowerSeniority = seniority_level.toLowerCase();
      if (lowerSeniority.includes('senior')) {
        experience_required = '5+ years';
      } else if (lowerSeniority.includes('junior')) {
        experience_required = '1-2 years';
      } else if (
        lowerSeniority.includes('fresher') ||
        lowerSeniority.includes('entry')
      ) {
        experience_required = '0-1 years';
      } else if (lowerSeniority.includes('lead') || lowerSeniority.includes('expert')) {
        experience_required = '8+ years';
      } else {
        experience_required = '3+ years';
      }
    }

    // Validate description (Strict rejection for empty description)
    if (
      !raw.description ||
      typeof raw.description !== 'string' ||
      !raw.description.trim()
    ) {
      this.logger.error(
        '[AI JOB] Validation failed: Missing or empty description',
      );
      throw new InternalServerErrorException(
        'AI output validation failed: Missing job description.',
      );
    }
    const description = raw.description.trim();

    // Validate and normalize required_skills (Strict rejection for empty skills)
    if (!Array.isArray(raw.required_skills)) {
      this.logger.error(
        '[AI JOB] Validation failed: required_skills is not an array',
      );
      throw new InternalServerErrorException(
        'AI output validation failed: required_skills must be an array.',
      );
    }

    const uniqueSkillsMap = new Map<string, string>();
    for (const skill of raw.required_skills) {
      if (typeof skill === 'string' && skill.trim().length > 0) {
        const trimmed = skill.trim();
        const lower = trimmed.toLowerCase();
        if (!uniqueSkillsMap.has(lower)) {
          uniqueSkillsMap.set(lower, trimmed);
        }
      }
    }
    const normalizedSkills = Array.from(uniqueSkillsMap.values());

    if (normalizedSkills.length === 0) {
      this.logger.error(
        '[AI JOB] Validation failed: No valid required_skills after normalization',
      );
      throw new InternalServerErrorException(
        'AI output validation failed: Job must contain at least one required skill.',
      );
    }

    // Validate and clean responsibilities
    let cleanResponsibilities: string[] = [];
    if (Array.isArray(raw.responsibilities)) {
      cleanResponsibilities = raw.responsibilities
        .filter((r: any) => typeof r === 'string' && r.trim().length > 0)
        .map((r: string) => r.trim());
    }
    if (cleanResponsibilities.length === 0) {
      cleanResponsibilities = [
        'Design, build, and maintain efficient, reusable, and reliable code.',
        'Collaborate with cross-functional teams to define, design, and ship new features.',
      ];
    }

    // Validate and clean qualifications
    let cleanQualifications: string[] = [];
    if (Array.isArray(raw.qualifications)) {
      cleanQualifications = raw.qualifications
        .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
        .map((q: string) => q.trim());
    }
    if (cleanQualifications.length === 0) {
      cleanQualifications = [
        "Bachelor's degree in Computer Science or relevant technical practical experience.",
      ];
    }

    // Location: only include if supplied by HR or present in original JD
    let finalLocation: string | undefined = undefined;
    if (suppliedLocation && suppliedLocation.trim().length > 0) {
      finalLocation = suppliedLocation.trim();
    } else if (
      raw.location &&
      typeof raw.location === 'string' &&
      raw.location.trim().length > 0
    ) {
      finalLocation = raw.location.trim();
    }

    const validated: StructuredJobData = {
      title,
      department,
      seniority_level,
      experience_required,
      description,
      required_skills: normalizedSkills,
      responsibilities: cleanResponsibilities,
      qualifications: cleanQualifications,
    };

    if (finalLocation) {
      validated.location = finalLocation;
    }

    return validated;
  }
}
