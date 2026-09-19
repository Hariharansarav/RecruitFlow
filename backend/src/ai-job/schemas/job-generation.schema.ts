/**
 * Interface representing the structured job payload generated or extracted by AI.
 */
export interface StructuredJobData {
  title: string;
  department: string;
  seniority_level: string;
  experience_required: string;
  description: string;
  required_skills: string[];
  responsibilities: string[];
  qualifications: string[];
  location?: string;
}

/**
 * Standard API response wrapper for successful AI job operations.
 */
export interface StructuredJobApiResponse {
  success: boolean;
  data: StructuredJobData;
}

/**
 * Groq-compatible JSON Schema definition for strict structured output.
 */
export const JOB_GENERATION_JSON_SCHEMA = {
  name: 'job_description_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Professional, industry-standard job title.',
      },
      department: {
        type: 'string',
        description: 'Relevant department or organizational unit (e.g., Engineering, Product, Design).',
      },
      seniority_level: {
        type: 'string',
        description: 'Seniority level (e.g., Entry Level / Fresher, Junior, Mid-Level, Senior, Lead / Expert).',
      },
      experience_required: {
        type: 'string',
        description: 'Experience requirement description (e.g., "0-1 years", "3-5 years", etc.).',
      },
      description: {
        type: 'string',
        description: 'Comprehensive, professional summary and overview of the position.',
      },
      required_skills: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of core technical skills and essential technologies.',
      },
      responsibilities: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of key day-to-day duties and core responsibilities.',
      },
      qualifications: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of educational requirements, certifications, and technical qualifications.',
      },
      location: {
        type: 'string',
        description: 'Work location if explicitly provided in prompt/JD, otherwise an empty string. Never fabricate a location.',
      },
    },
    required: [
      'title',
      'department',
      'seniority_level',
      'experience_required',
      'description',
      'required_skills',
      'responsibilities',
      'qualifications',
      'location',
    ],
    additionalProperties: false,
  },
};
