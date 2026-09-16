import { Injectable, Logger } from '@nestjs/common';

export interface SkillMatchResult {
  required_skills: string[];
  candidate_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  match_percentage: number;
}

@Injectable()
export class CandidateMatchingService {
  private readonly logger = new Logger(CandidateMatchingService.name);

  /**
   * Normalizes a comma-separated skills string:
   * - Splits by comma
   * - Trims whitespace
   * - Converts to lowercase
   * - Removes empty tokens
   * - Removes duplicate skills while preserving order
   */
  normalizeSkills(skills: string | null | undefined): string[] {
    if (!skills || typeof skills !== 'string') {
      return [];
    }

    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const part of skills.split(',')) {
      const trimmed = part.trim().toLowerCase();
      if (trimmed.length > 0 && !seen.has(trimmed)) {
        seen.add(trimmed);
        normalized.push(trimmed);
      }
    }

    return normalized;
  }

  /**
   * Compares candidate skills against job required skills using
   * a skills-overlap screening algorithm.
   *
   * matchPercentage = (matchedSkills / requiredSkills) * 100
   * Rounded to the nearest whole integer.
   */
  calculateMatch(
    candidateSkillsStr: string | null | undefined,
    jobRequiredSkillsStr: string | null | undefined,
  ): SkillMatchResult {
    const requiredSkills = this.normalizeSkills(jobRequiredSkillsStr);
    const candidateSkills = this.normalizeSkills(candidateSkillsStr);

    // Edge Case: Job has no required skills (avoid divide by zero)
    if (requiredSkills.length === 0) {
      return {
        required_skills: [],
        candidate_skills: candidateSkills,
        matched_skills: [],
        missing_skills: [],
        match_percentage: 0,
      };
    }

    // Edge Case: Candidate has no skills
    if (candidateSkills.length === 0) {
      return {
        required_skills: requiredSkills,
        candidate_skills: [],
        matched_skills: [],
        missing_skills: [...requiredSkills],
        match_percentage: 0,
      };
    }

    const candidateSkillsSet = new Set(candidateSkills);
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      if (candidateSkillsSet.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const matchPercentage = Math.round(
      (matchedSkills.length / requiredSkills.length) * 100,
    );

    return {
      required_skills: requiredSkills,
      candidate_skills: candidateSkills,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      match_percentage: matchPercentage,
    };
  }
}
