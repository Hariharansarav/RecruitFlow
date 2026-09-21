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
      'openai/gpt-oss-120b',
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
