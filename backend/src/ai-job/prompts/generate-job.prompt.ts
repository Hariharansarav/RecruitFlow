import { GenerateJobDto } from '../dto/generate-job.dto';

/**
 * Returns human-readable seniority classification and precise guidance based on experience years.
 */
export function getSeniorityDetails(years: number): {
  level: string;
  focus: string;
  restrictions: string;
} {
  if (years === 0) {
    return {
      level: 'Entry Level / Fresher',
      focus:
        'Core fundamental concepts, basic tool usage, eager learning mindset, foundational coding/technical skills, and entry-level task execution under guidance.',
      restrictions:
        'STRICT: Do NOT include technical leadership, architecture design/ownership, mentoring, or team management. Keep qualifications and responsibilities tailored to fresh graduates or entry-level candidates.',
    };
  } else if (years <= 2) {
    return {
      level: 'Junior',
      focus:
        'Hands-on implementation, working knowledge of primary tech stack, routine debugging, third-party and API integrations, and independent execution of well-defined smaller tasks.',
      restrictions:
        'STRICT: Do NOT require system architecture ownership, high-level technical strategy, or team management.',
    };
  } else if (years <= 5) {
    return {
      level: 'Mid-Level',
      focus:
        'Independent feature ownership, strong problem solving, clean code quality, unit and integration testing, component-level design, and end-to-end system understanding.',
      restrictions:
        'Focus on solid execution and self-direction. Avoid enterprise-wide architectural strategy or executive technical leadership unless role-appropriate.',
    };
  } else if (years <= 8) {
    return {
      level: 'Senior',
      focus:
        'Technical ownership of major modules, architecture and design patterns, performance optimization, mentoring junior engineers, thorough code reviews, and sound technical decision making.',
      restrictions:
        'Expect strong autonomy, high design standards, and collaborative technical leadership.',
    };
  } else {
    return {
      level: 'Lead / Expert',
      focus:
        'High-level system architecture, engineering vision and strategy, technical leadership, cross-functional collaboration, driving engineering best practices, and mentoring senior team members.',
      restrictions:
        'Emphasize strategic impact, scalability, and broad technical governance.',
    };
  }
}

/**
 * Generates system and user prompts for AI Job Generation based on role and experience.
 */
export function buildGenerateJobPrompt(dto: GenerateJobDto): {
  systemPrompt: string;
  userPrompt: string;
} {
  const seniority = getSeniorityDetails(dto.experience_years);

  const systemPrompt = `You are an expert Technical Recruiter, Talent Acquisition Leader, and Job Architecture Specialist.
Your task is to generate a realistic, highly professional, structured Job Description tailored precisely to the given Job Role and Years of Experience.

CRITICAL EXPERIENCE-LEVEL RULES:
1. Candidate Experience: ${dto.experience_years} year(s).
2. Assigned Seniority Level: ${seniority.level}.
3. Technical Focus: ${seniority.focus}.
4. Restrictions: ${seniority.restrictions}.
5. Do NOT simply inflate skill counts for higher experience. Instead, adapt:
   - Skill depth and technical complexity
   - Scope of responsibilities and ownership
   - System design and architecture expectations
   - Leadership, mentorship, and decision-making level
6. For 0 years (Fresher): Focus on fundamentals, core syntax, problem-solving basics, and willingness to learn. Absolutely NO senior leadership or architectural ownership.
7. Role Accuracy: The skills, responsibilities, and qualifications must genuinely match the job role (${dto.job_title}). Do not assign backend/DevOps skills to a frontend designer unless the role explicitly dictates it.
8. Location Rules: If a location is provided by HR, use it. If no location is provided, output an empty string "". NEVER fabricate a location.
9. Output strictly in valid JSON adhering to the provided schema.`;

  const userPrompt = `Generate a complete structured Job Description with the following input parameters:
- Job Title: "${dto.job_title}"
- Experience Required: ${dto.experience_years} years (${seniority.level})
${dto.department ? `- Department: "${dto.department}"` : '- Department: Determine the most appropriate industry-standard department (e.g. Engineering, Technology, Design, Product)'}
${dto.location ? `- Location: "${dto.location}"` : '- Location: Not provided (set location to "")'}

Ensure:
- "title": Professional and accurate
- "department": Professional department name
- "seniority_level": "${seniority.level}"
- "experience_required": Descriptive experience range string matching ${dto.experience_years} years (e.g., "${dto.experience_years === 0 ? '0-1 years / Fresher' : dto.experience_years + '+ years'}")
- "description": Engaging, professional summary of the opportunity and role
- "required_skills": Array of distinct, relevant technical skills (case-normalized, no duplicates, no empty strings)
- "responsibilities": Array of actionable, clear day-to-day duties appropriate for this experience level
- "qualifications": Array of practical education and technical qualification requirements
- "location": "${dto.location || ''}"`;

  return { systemPrompt, userPrompt };
}
