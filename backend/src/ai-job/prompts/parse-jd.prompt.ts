/**
 * Generates system and user prompts for parsing and structuring existing Job Descriptions.
 */
export function buildParseJdPrompt(extractedJdText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an expert Technical Recruiter and Job Description Extraction Specialist.
Your task is to analyze, extract, and structure an existing Job Description (JD) into a clean, normalized JSON format according to the given schema.

CRITICAL PARSING AND EXTRACTION RULES:
1. The provided Job Description text is the PRIMARY AND EXCLUSIVE SOURCE OF TRUTH.
2. Ground your output strictly in the provided text.
3. Do NOT hallucinate, assume, or invent skills, requirements, or qualifications that are not mentioned in or clearly supported by the JD text.
4. Extract the following components:
   - "title": Exact or standardized professional role title from the text.
   - "department": Department if stated or clearly identifiable; otherwise a generic appropriate department (e.g. "Engineering").
   - "seniority_level": Identify from context (e.g. "Entry Level / Fresher", "Junior", "Mid-Level", "Senior", "Lead / Expert").
   - "experience_required": Required years or experience description stated in the JD (e.g. "3-5 years", "Minimum 2 years", "Freshers welcome"). If exact years are not explicitly stated, infer an appropriate experience requirement based on the role and seniority (e.g. "3+ years" for Mid-Level, "5+ years" for Senior, "0-1 years" for Fresher) so this field is NEVER empty.
   - "description": Comprehensive, well-structured summary of the role based on the JD text formatted strictly as a single cohesive paragraph without any markdown headers or bullet points.
   - "required_skills": Array of distinct technical skills and technologies explicitly mentioned or required. Remove duplicates case-insensitively.
   - "responsibilities": Array of explicit key duties and responsibilities mentioned in the JD.
   - "qualifications": Array of explicit education, degree, or experience qualifications mentioned.
   - "location": Include location ONLY if explicitly stated in the JD. If no location is mentioned, set location to "". NEVER invent or assume a city/location.
5. If certain non-skill information is missing in the JD text (such as department or experience requirement), provide an appropriate professional default rather than leaving it empty, but never fabricate unmentioned technical skills.
6. Output strictly in valid JSON adhering to the provided schema.`;

  const userPrompt = `Please parse and structure the following Job Description text:

--- BEGIN JOB DESCRIPTION ---
${extractedJdText}
--- END JOB DESCRIPTION ---

Extract all information and format into the exact structured schema.`;

  return { systemPrompt, userPrompt };
}
