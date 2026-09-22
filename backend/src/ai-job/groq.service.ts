import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  JOB_GENERATION_JSON_SCHEMA,
  StructuredJobData,
} from './schemas/job-generation.schema';

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private groqClient: Groq | null = null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.modelName = this.configService.get<string>(
      'GROQ_MODEL',
      'openai/gpt-oss-20b',
    );

    if (apiKey && apiKey.trim().length > 0) {
      this.groqClient = new Groq({ apiKey: apiKey.trim() });
      this.logger.log(
        `Groq client initialized with model: ${this.modelName}`,
      );
    } else {
      this.logger.warn(
        'GROQ_API_KEY is not defined or empty in environment. Groq requests will be rejected until configured.',
      );
    }
  }

  /**
   * Send a structured chat completion request to Groq using json_schema mode.
   */
  async generateStructuredJob(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<StructuredJobData> {
    const client = this.getGroqClient();

    this.logger.log(`[AI JOB] Calling Groq with model: ${this.modelName}`);

    try {
      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: JOB_GENERATION_JSON_SCHEMA,
        },
        temperature: 0.2,
      });

      const responseContent = completion.choices?.[0]?.message?.content;

      if (!responseContent) {
        this.logger.error('[AI JOB] Groq returned an empty response content.');
        throw new InternalServerErrorException(
          'AI provider returned an empty response.',
        );
      }

      this.logger.log('[AI JOB] Structured response received from Groq');

      // Parse JSON
      try {
        const parsed: StructuredJobData = JSON.parse(responseContent);
        return parsed;
      } catch (jsonErr: any) {
        this.logger.error(
          `[AI JOB] Failed to parse Groq response as JSON: ${jsonErr.message}`,
        );
        throw new InternalServerErrorException(
          'Failed to parse structured response from AI model.',
        );
      }
    } catch (error: any) {
      this.handleGroqError(error);
      throw error;
    }
  }

  /**
   * Summarizes a Job Description for a technical interviewer/Tech Lead.
   * Generates a concise, 3-4 sentence summary highlighting the core purpose, technical focus, and critical skills.
   * Includes robust fallback if Groq API is unreachable.
   */
  async summarizeJobDescription(
    title: string,
    description: string,
    requiredSkills?: string,
  ): Promise<string> {
    const fallbackSummary = () => {
      const cleanDesc = (description || '').replace(/\s+/g, ' ').trim();
      const excerpt =
        cleanDesc.length > 250
          ? `${cleanDesc.substring(0, 247)}...`
          : cleanDesc;
      const skillsNote = requiredSkills
        ? `\nKey Competencies: ${requiredSkills}`
        : '';
      return `Position Overview: ${title}. Key focus: ${excerpt}${skillsNote}`;
    };

    try {
      const client = this.getGroqClient();

      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert technical recruiter and interviewer assistant. Summarize the provided Job Description into 3 to 4 concise, high-impact sentences tailored for a Tech Lead who will conduct the technical evaluation. Highlight the role\'s primary objective, key technical domain, and the most critical competencies to assess. Do not use conversational filler or markdown headers; output only the professional summary paragraph.',
          },
          {
            role: 'user',
            content: `Job Title: ${title}\nRequired Skills: ${requiredSkills || 'N/A'}\nFull Job Description:\n${description}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const summary = completion.choices?.[0]?.message?.content?.trim();
      if (summary && summary.length > 20) {
        this.logger.log(`[Groq] Successfully generated JD summary for "${title}"`);
        return summary;
      }

      return fallbackSummary();
    } catch (err: any) {
      this.logger.warn(
        `[Groq] AI summarization failed (${err.message}). Using structured fallback summary.`,
      );
      return fallbackSummary();
    }
  }

  /**
   * Redesigns, polishes, and regenerates a Job Description Overview from user draft notes or text.
   * STRICTLY formats the output as a single, cohesive, high-impact paragraph with NO added elements
   * (no markdown headings, no bullet points, and no separate sections).
   */
  async redesignAndEnhanceDescription(
    title: string = 'Position',
    description: string = '',
    department: string = '',
  ): Promise<string> {
    const rawInput = (description || '').trim();

    const fallbackEnhance = () => {
      if (rawInput.length > 0) {
        // Strip markdown header tokens and return the user's content safely
        return rawInput
          .replace(/#{1,6}\s*/g, '')
          .replace(/\*\*/g, '')
          .trim();
      }
      return `We are seeking a talented and proactive ${title} to join our ${department || 'Engineering'} team, where you will take ownership of designing and delivering robust solutions, collaborate cross-functionally across product and engineering teams, and uphold industry-leading standards for quality, scalability, and performance.`;
    };

    try {
      const client = this.getGroqClient();

      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are an elite talent acquisition specialist and executive copywriter. Enhance, polish, and synthesize the user-provided draft notes and content into a single cohesive, high-impact paragraph for the Job Description.\n' +
              'IMPORTANT RULES:\n' +
              '1. Incorporate ALL technical skills, responsibilities, tools, and notes provided by the user.\n' +
              '2. Do NOT wipe out or delete details the user provided.\n' +
              '3. Output ONLY the polished paragraph. Do NOT add conversational filler, markdown headers, or bullet lists.',
          },
          {
            role: 'user',
            content: `Job Title: ${title}\nDepartment: ${department || 'General'}\nContent to Polish & Integrate:\n${rawInput || title}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const enhanced = completion.choices?.[0]?.message?.content?.trim();
      if (enhanced && enhanced.length > 20) {
        // Safely strip markdown header hashes and bold symbols without deleting text lines
        const singlePara = enhanced
          .replace(/#{1,6}\s*/g, '')
          .replace(/\*\*/g, '')
          .replace(/^[\s*•-]+/gm, '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join(' ')
          .trim();

        if (singlePara.length > 20) {
          this.logger.log(`[Groq] Successfully regenerated single-paragraph JD overview for "${title}"`);
          return singlePara;
        }
      }

      return fallbackEnhance();
    } catch (err: any) {
      this.logger.warn(
        `[Groq] AI JD enhancement failed (${err.message}). Using fallback formatting.`,
      );
      return fallbackEnhance();
    }
  }

  /**
   * Compares candidate resume text against a Job Description.
   * Evaluates competencies, computes percentage match (0-100%), and returns structured findings.
   */
  async screenResumeAgainstJob(
    jobDetails: {
      title: string;
      description: string;
      required_skills: string;
      experience_required?: string;
    },
    resumeText: string,
  ): Promise<{
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    strengths: string[];
    recommendation: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'POOR_MATCH';
    summary: string;
  }> {
    const requiredSkillsList = (jobDetails.required_skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const fallbackResult = () => {
      const lowerResume = (resumeText || '').toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];

      for (const skill of requiredSkillsList) {
        if (lowerResume.includes(skill.toLowerCase())) {
          matched.push(skill);
        } else {
          missing.push(skill);
        }
      }

      const total = requiredSkillsList.length || 1;
      let pct = Math.round((matched.length / total) * 100);
      if (pct === 0 && lowerResume.length > 100) {
        pct = 45; // baseline partial match for substantive resume
      }

      const rec: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'POOR_MATCH' =
        pct >= 75 ? 'STRONG_MATCH' : pct >= 50 ? 'MODERATE_MATCH' : 'POOR_MATCH';

      return {
        match_percentage: pct,
        matched_skills: matched,
        missing_skills: missing,
        strengths: matched.slice(0, 4),
        recommendation: rec,
        summary: `Candidate demonstrates alignment with ${matched.length} of ${requiredSkillsList.length} required competencies for ${jobDetails.title}. Overall profile match is evaluated at ${pct}%.`,
      };
    };

    try {
      const client = this.getGroqClient();

      const promptSystem =
        'You are an expert AI Technical Recruiter. Compare the candidate resume against the Job Description.\n' +
        'Evaluate relevant experience, technical competencies, frameworks, and role alignment.\n' +
        'Return ONLY a valid, parseable JSON object with no markdown fences, matching this structure:\n' +
        '{\n' +
        '  "match_percentage": <number between 0 and 100>,\n' +
        '  "matched_skills": [<string array of matching skills/tools found in resume>],\n' +
        '  "missing_skills": [<string array of required skills missing from resume>],\n' +
        '  "strengths": [<string array of top 2 to 4 candidate highlights relevant to this role>],\n' +
        '  "recommendation": <"STRONG_MATCH" | "MODERATE_MATCH" | "POOR_MATCH">,\n' +
        '  "summary": <concise 2-3 sentence technical assessment explaining the evaluation>\n' +
        '}';

      const promptUser =
        `Job Title: ${jobDetails.title}\n` +
        `Required Skills: ${jobDetails.required_skills}\n` +
        `Experience Required: ${jobDetails.experience_required || 'N/A'}\n` +
        `Job Description:\n${(jobDetails.description || '').substring(0, 2500)}\n\n` +
        `Candidate Resume Content:\n${(resumeText || '').substring(0, 6000)}`;

      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: promptUser },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices?.[0]?.message?.content?.trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        const matchPct = Math.min(
          100,
          Math.max(0, Math.round(Number(parsed.match_percentage) || 0)),
        );
        const matched = Array.isArray(parsed.matched_skills)
          ? parsed.matched_skills.map((s: any) => String(s))
          : [];
        const missing = Array.isArray(parsed.missing_skills)
          ? parsed.missing_skills.map((s: any) => String(s))
          : [];
        const strengths = Array.isArray(parsed.strengths)
          ? parsed.strengths.map((s: any) => String(s))
          : [];
        const rec = ['STRONG_MATCH', 'MODERATE_MATCH', 'POOR_MATCH'].includes(
          parsed.recommendation,
        )
          ? parsed.recommendation
          : matchPct >= 75
          ? 'STRONG_MATCH'
          : matchPct >= 50
          ? 'MODERATE_MATCH'
          : 'POOR_MATCH';

        return {
          match_percentage: matchPct,
          matched_skills: matched,
          missing_skills: missing,
          strengths,
          recommendation: rec,
          summary:
            parsed.summary ||
            `Candidate matches ${matchPct}% of the job competencies.`,
        };
      }

      return fallbackResult();
    } catch (err: any) {
      this.logger.warn(
        `[Groq] AI resume screening error (${err.message}). Using fallback matching.`,
      );
      return fallbackResult();
    }
  }


  /**
   * Lazily ensure client is available, re-checking config if needed.
   */
  private getGroqClient(): Groq {
    if (this.groqClient) {
      return this.groqClient;
    }

    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey || apiKey.trim().length === 0) {
      this.logger.error(
        '[AI JOB] AI service unavailable: GROQ_API_KEY is not configured.',
      );
      throw new ServiceUnavailableException(
        'AI service is currently unavailable. Please configure GROQ_API_KEY.',
      );
    }

    this.groqClient = new Groq({ apiKey: apiKey.trim() });
    return this.groqClient;
  }

  /**
   * Translates Groq errors into appropriate HTTP exceptions without leaking sensitive credentials.
   */
  private handleGroqError(error: any): never {
    // Check for standard HTTP exception already thrown
    if (error instanceof HttpException) {
      throw error;
    }

    const status = error?.status || error?.statusCode;
    const message = error?.message || 'Unknown Groq error';

    this.logger.error(
      `[AI JOB] Groq API error: status=${status}, message=${message}`,
    );

    // Rate Limit (429)
    if (status === 429) {
      throw new HttpException(
        'AI provider rate limit reached. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Authentication failure / Invalid API key (401)
    if (status === 401) {
      throw new ServiceUnavailableException(
        'AI service configuration authentication failed. Please verify GROQ_API_KEY.',
      );
    }

    // Provider unavailable / 503
    if (status === 503 || status === 502) {
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable from provider. Please try again later.',
      );
    }

    // Network / timeout error
    if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET') {
      throw new ServiceUnavailableException(
        'AI service request timed out or connection was reset.',
      );
    }

    throw new InternalServerErrorException(
      'An unexpected error occurred during AI processing.',
    );
  }
}
