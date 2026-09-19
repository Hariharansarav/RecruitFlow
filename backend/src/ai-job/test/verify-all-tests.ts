import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateJobDto } from '../dto/generate-job.dto';
import { ParseJdDto } from '../dto/parse-jd.dto';
import { AiJobService } from '../ai-job.service';
import { GroqService } from '../groq.service';
import { DocumentParserService, UploadedFileDto } from '../document-parser.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { buildGenerateJobPrompt, getSeniorityDetails } from '../prompts/generate-job.prompt';
import { buildParseJdPrompt } from '../prompts/parse-jd.prompt';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

async function runAllTests() {
  console.log('====================================================');
  console.log('RUNNING AI JOB CREATION & INTELLIGENCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Mock implementations for unit/service isolation
  // ----------------------------------------------------
  const mockConfigService: any = {
    get: (key: string, defaultValue?: any) => {
      if (key === 'GROQ_MODEL') return 'openai/gpt-oss-120b';
      if (key === 'GROQ_API_KEY') return 'mock-key';
      return defaultValue;
    },
  };

  const mockUserRepository: any = {
    findOne: async ({ where }: any) => {
      if (where.id === 1) {
        return { id: 1, name: 'HR Admin', email: 'hr@recruitment.com', role: UserRole.HR };
      }
      if (where.id === 2) {
        return { id: 2, name: 'Company User', email: 'company@recruitment.com', role: UserRole.COMPANY };
      }
      return null;
    },
  };

  const documentParserService = new DocumentParserService();
  const mockGroqService: any = {
    generateStructuredJob: async (sys: string, user: string) => {
      return {
        title: 'Software Engineer',
        department: 'Engineering',
        seniority_level: 'Mid-Level',
        experience_required: '3-5 years',
        description: 'Great role',
        required_skills: ['TypeScript', 'NodeJS', 'PostgreSQL'],
        responsibilities: ['Build APIs', 'Write tests'],
        qualifications: ['Bachelor in CS'],
        location: '',
      };
    },
  };

  const aiJobService = new AiJobService(
    mockGroqService,
    documentParserService,
    mockUserRepository,
  );

  // ----------------------------------------------------
  // TEST 1: Generate Fresher Job (0 years)
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Generate Fresher Job (0 years) ---');
  const fresherDto: GenerateJobDto = plainToInstance(GenerateJobDto, {
    job_title: 'Frontend Developer',
    experience_years: 0,
  });
  const fresherPrompt = buildGenerateJobPrompt(fresherDto);
  const fresherSeniority = getSeniorityDetails(0);
  assert(
    fresherSeniority.level.includes('Fresher') || fresherSeniority.level.includes('Entry Level'),
    'TEST 1.1: Seniority mapping for 0 years is Entry Level / Fresher',
  );
  assert(
    fresherPrompt.systemPrompt.includes('STRICT: Do NOT include technical leadership') &&
      fresherPrompt.systemPrompt.includes('For 0 years (Fresher): Focus on fundamentals'),
    'TEST 1.2: System prompt enforces fundamentals and strictly forbids senior leadership',
  );

  const fresherMockAiOutput = {
    title: 'Frontend Developer',
    department: 'Engineering',
    seniority_level: 'Entry Level / Fresher',
    experience_required: '0-1 years / Fresher',
    description: 'Entry level frontend role focusing on HTML, CSS, JavaScript basics.',
    required_skills: ['HTML5', 'CSS3', 'JavaScript', 'React fundamentals', 'Git'],
    responsibilities: ['Implement UI components', 'Assist in debugging', 'Learn modern frameworks'],
    qualifications: ["Bachelor's degree in Computer Science or related field"],
    location: '',
  };
  const validatedFresher = aiJobService.validateJobOutput(fresherMockAiOutput);
  assert(
    validatedFresher.seniority_level === 'Entry Level / Fresher',
    'TEST 1.3: Validated output has Entry Level / Fresher seniority',
  );
  assert(
    validatedFresher.required_skills.includes('HTML5') &&
      !validatedFresher.responsibilities.some((r) => r.toLowerCase().includes('architect')),
    'TEST 1.4: Output contains fundamental skills without senior architecture',
  );

  // ----------------------------------------------------
  // TEST 2: Generate Junior Job (2 years)
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Generate Junior Job (2 years) ---');
  const juniorDto = plainToInstance(GenerateJobDto, {
    job_title: 'Backend Developer',
    experience_years: 2,
  });
  const juniorSeniority = getSeniorityDetails(juniorDto.experience_years);
  assert(juniorSeniority.level === 'Junior', 'TEST 2.1: Seniority mapping is Junior');
  assert(
    juniorSeniority.focus.includes('debugging') && juniorSeniority.focus.includes('API integration'),
    'TEST 2.2: Focus is on practical implementation and API integration',
  );

  // ----------------------------------------------------
  // TEST 3: Generate Mid-Level Job (4 years)
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Generate Mid-Level Job (4 years) ---');
  const midDto = plainToInstance(GenerateJobDto, {
    job_title: 'DevOps Engineer',
    experience_years: 4,
  });
  const midSeniority = getSeniorityDetails(midDto.experience_years);
  assert(midSeniority.level === 'Mid-Level', 'TEST 3.1: Seniority mapping is Mid-Level');
  assert(
    midSeniority.focus.includes('Independent feature ownership') ||
      midSeniority.focus.includes('independent ownership'),
    'TEST 3.2: Focus includes independent ownership and strong problem solving',
  );

  // ----------------------------------------------------
  // TEST 4: Generate Senior Job (7 years)
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Generate Senior Job (7 years) ---');
  const seniorDto = plainToInstance(GenerateJobDto, {
    job_title: 'Full Stack Developer',
    experience_years: 7,
  });
  const seniorSeniority = getSeniorityDetails(seniorDto.experience_years);
  assert(seniorSeniority.level === 'Senior', 'TEST 4.1: Seniority mapping is Senior');
  assert(
    seniorSeniority.focus.includes('Technical ownership') &&
      seniorSeniority.focus.includes('mentoring') &&
      seniorSeniority.focus.includes('code reviews'),
    'TEST 4.2: Focus includes technical ownership, architecture, mentoring, and code reviews',
  );

  // ----------------------------------------------------
  // TEST 5: Invalid Experience (-1)
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Invalid Experience (-1) ---');
  const invalidExpDto = plainToInstance(GenerateJobDto, {
    job_title: 'Developer',
    experience_years: -1,
  });
  const expErrors = await validate(invalidExpDto);
  assert(
    expErrors.length > 0 && expErrors.some((e) => e.property === 'experience_years'),
    'TEST 5.1: Negative experience (-1) is rejected by class-validator',
  );

  const largeExpDto = plainToInstance(GenerateJobDto, {
    job_title: 'Developer',
    experience_years: 150,
  });
  const largeExpErrors = await validate(largeExpDto);
  assert(
    largeExpErrors.length > 0 && largeExpErrors.some((e) => e.property === 'experience_years'),
    'TEST 5.2: Unrealistic experience (150) is rejected by class-validator',
  );

  // ----------------------------------------------------
  // TEST 6: Missing Job Title
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Missing Job Title ---');
  const missingTitleDto = plainToInstance(GenerateJobDto, {
    experience_years: 3,
  });
  const titleErrors = await validate(missingTitleDto);
  assert(
    titleErrors.length > 0 && titleErrors.some((e) => e.property === 'job_title'),
    'TEST 6.1: Missing job_title is rejected by class-validator',
  );

  // ----------------------------------------------------
  // TEST 7: JD Parsing with Plain Text
  // ----------------------------------------------------
  console.log('\n--- TEST 7: JD Parsing with Plain Text ---');
  const realisticJd = `
    Job Title: Senior Backend Engineer
    Department: Cloud Platforms
    Location: Bengaluru
    Experience: 5+ years
    About the role:
    We are seeking a skilled Senior Backend Engineer to build high-scale microservices.
    Key Responsibilities:
    - Design and develop robust RESTful and gRPC APIs
    - Optimize database queries and schema designs in PostgreSQL
    - Mentor junior developers and participate in code reviews
    Required Skills:
    - Node.js, TypeScript, PostgreSQL, Docker, Redis, Kubernetes
    Qualifications:
    - BS/MS in Computer Science or equivalent
  `;
  const jdPrompt = buildParseJdPrompt(realisticJd);
  assert(
    jdPrompt.systemPrompt.includes('PRIMARY AND EXCLUSIVE SOURCE OF TRUTH') &&
      jdPrompt.systemPrompt.includes('Do NOT hallucinate'),
    'TEST 7.1: Parse prompt enforces strict grounding and no hallucination',
  );

  const mockParsedJdOutput = {
    title: 'Senior Backend Engineer',
    department: 'Cloud Platforms',
    seniority_level: 'Senior',
    experience_required: '5+ years',
    description: 'We are seeking a skilled Senior Backend Engineer to build high-scale microservices.',
    required_skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Redis', 'Kubernetes'],
    responsibilities: [
      'Design and develop robust RESTful and gRPC APIs',
      'Optimize database queries and schema designs in PostgreSQL',
      'Mentor junior developers and participate in code reviews',
    ],
    qualifications: ['BS/MS in Computer Science or equivalent'],
    location: 'Bengaluru',
  };
  const validatedParsed = aiJobService.validateJobOutput(mockParsedJdOutput);
  assert(
    validatedParsed.title === 'Senior Backend Engineer' &&
      validatedParsed.location === 'Bengaluru' &&
      validatedParsed.required_skills.includes('Node.js'),
    'TEST 7.2: Successfully extracted title, skills, responsibilities, and preserved location',
  );

  // ----------------------------------------------------
  // TEST 8: JD Parsing with PDF (Text Extraction)
  // ----------------------------------------------------
  console.log('\n--- TEST 8: JD Parsing with PDF ---');
  // Simple PDF mock test - verify parser rejects invalid format and validates PDF mime
  const invalidExtFile: UploadedFileDto = {
    originalname: 'test.exe',
    mimetype: 'application/octet-stream',
    size: 100,
    buffer: Buffer.from('fake binary content'),
  };
  let rejectedInvalidExt = false;
  try {
    await documentParserService.parseFile(invalidExtFile);
  } catch (err: any) {
    if (err instanceof BadRequestException) rejectedInvalidExt = true;
  }
  assert(rejectedInvalidExt, 'TEST 8.1: Document parser rejects non-PDF/DOCX file extension');

  // Valid minimal PDF stream extraction
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 64 >> stream
BT
/F1 12 Tf
100 700 Td
(Senior Cloud Engineer with Kubernetes AWS Terraform Docker) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000359 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
433
%%EOF`;

  const validPdfFile: UploadedFileDto = {
    originalname: 'job_description.pdf',
    mimetype: 'application/pdf',
    size: Buffer.byteLength(minimalPdf),
    buffer: Buffer.from(minimalPdf),
  };

  try {
    const pdfParsed = await documentParserService.parseFile(validPdfFile);
    assert(
      pdfParsed.text.includes('Senior Cloud Engineer') && pdfParsed.text.includes('Kubernetes'),
      'TEST 8.2: Valid PDF document text is extracted successfully in-memory',
    );
  } catch (err: any) {
    console.error('PDF extraction failed:', err.message);
    assert(false, 'TEST 8.2: Valid PDF document text is extracted successfully in-memory', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: JD Parsing with DOCX
  // ----------------------------------------------------
  console.log('\n--- TEST 9: JD Parsing with DOCX ---');
  // DocumentParserService handles .docx extension validation
  const emptyDocxFile: UploadedFileDto = {
    originalname: 'job_description.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 10,
    buffer: Buffer.from('pk\x03\x04'),
  };
  let docxHandled = false;
  try {
    await documentParserService.parseFile(emptyDocxFile);
  } catch (err: any) {
    // Should catch UnprocessableEntityException because buffer isn't valid docx or yields empty text
    if (err instanceof UnprocessableEntityException) docxHandled = true;
  }
  assert(docxHandled, 'TEST 9.1: Corrupt or unreadable docx properly throws UnprocessableEntityException');

  // ----------------------------------------------------
  // TEST 10: Empty JD Validation
  // ----------------------------------------------------
  console.log('\n--- TEST 10: Empty JD Validation ---');
  let emptyJdRejected = false;
  try {
    await aiJobService.parseJobDescription({ jd_text: '   ' });
  } catch (err: any) {
    if (err instanceof BadRequestException) emptyJdRejected = true;
  }
  assert(emptyJdRejected, 'TEST 10.1: Empty jd_text is rejected with BadRequestException');

  let shortJdRejected = false;
  try {
    await aiJobService.parseJobDescription({ jd_text: 'Too short' });
  } catch (err: any) {
    if (err instanceof BadRequestException) shortJdRejected = true;
  }
  assert(shortJdRejected, 'TEST 10.2: jd_text under 20 chars rejected with BadRequestException');

  // ----------------------------------------------------
  // TEST 11: Malformed AI Response Validation
  // ----------------------------------------------------
  console.log('\n--- TEST 11: Malformed AI Response Validation ---');
  let malformedCaught = false;
  try {
    aiJobService.validateJobOutput({
      title: '', // empty title
      department: 'Engineering',
      seniority_level: 'Junior',
      experience_required: '1 year',
      description: 'Desc',
      required_skills: ['JS'],
      responsibilities: ['Code'],
      qualifications: ['Degree'],
    });
  } catch (err: any) {
    malformedCaught = true;
  }
  assert(malformedCaught, 'TEST 11.1: Missing title in AI response rejected');

  let emptySkillsCaught = false;
  try {
    aiJobService.validateJobOutput({
      title: 'Engineer',
      department: 'Engineering',
      seniority_level: 'Junior',
      experience_required: '1 year',
      description: 'Desc',
      required_skills: [], // empty skills
      responsibilities: ['Code'],
      qualifications: ['Degree'],
    });
  } catch (err: any) {
    emptySkillsCaught = true;
  }
  assert(emptySkillsCaught, 'TEST 11.2: Empty required_skills in AI response rejected');

  // Skill deduplication case-insensitively
  const deduplicatedOutput = aiJobService.validateJobOutput({
    title: 'Engineer',
    department: 'Engineering',
    seniority_level: 'Junior',
    experience_required: '1 year',
    description: 'Desc',
    required_skills: ['JavaScript', 'javascript', 'JAVASCRIPT', 'React', 'react'],
    responsibilities: ['Code'],
    qualifications: ['Degree'],
  });
  assert(
    deduplicatedOutput.required_skills.length === 2 &&
      deduplicatedOutput.required_skills.includes('JavaScript') &&
      deduplicatedOutput.required_skills.includes('React'),
    'TEST 11.3: Case-insensitive skill deduplication works correctly',
  );

  // ----------------------------------------------------
  // TEST 12: Groq Unavailable Error Handling
  // ----------------------------------------------------
  console.log('\n--- TEST 12: Groq Unavailable / Missing Key Error Handling ---');
  const unconfiguredGroq = new GroqService({
    get: (key: string, def?: any) => (key === 'GROQ_API_KEY' ? '' : def),
  } as any);

  let groq503Caught = false;
  try {
    await unconfiguredGroq.generateStructuredJob('sys', 'user');
  } catch (err: any) {
    if (err instanceof ServiceUnavailableException) groq503Caught = true;
  }
  assert(
    groq503Caught,
    'TEST 12.1: Missing GROQ_API_KEY throws ServiceUnavailableException (503)',
  );

  // ----------------------------------------------------
  // TEST 13: Unauthorized User
  // ----------------------------------------------------
  console.log('\n--- TEST 13: Unauthorized User ---');
  let companyUserRejected = false;
  try {
    await aiJobService.validateHrUser(2); // user id 2 is COMPANY role
  } catch (err: any) {
    if (err instanceof ForbiddenException) companyUserRejected = true;
  }
  assert(
    companyUserRejected,
    'TEST 13.1: User with COMPANY role is rejected with ForbiddenException (403)',
  );

  let roleHeaderRejected = false;
  try {
    await aiJobService.validateHrUser(undefined, 'COMPANY');
  } catch (err: any) {
    if (err instanceof ForbiddenException) roleHeaderRejected = true;
  }
  assert(
    roleHeaderRejected,
    'TEST 13.2: Request with role header COMPANY is rejected with ForbiddenException (403)',
  );

  let hrUserAllowed = false;
  try {
    const hrUser = await aiJobService.validateHrUser(1); // user id 1 is HR role
    if (hrUser && hrUser.role === UserRole.HR) hrUserAllowed = true;
  } catch {
    hrUserAllowed = false;
  }
  assert(hrUserAllowed, 'TEST 13.3: User with HR role is permitted');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
