import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';
import * as mammoth from 'mammoth';

// Safe require for pdf-parse to handle commonjs export variations
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface ParsedDocumentResult {
  text: string;
  filename: string;
  mimetype: string;
  charCount: number;
}

export interface UploadedFileDto {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  // Maximum file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  // Maximum allowed extracted text length (characters)
  private readonly MAX_TEXT_LENGTH = 50000;

  private readonly ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  /**
   * Parse an uploaded file (PDF or DOCX) in-memory and return cleaned text.
   */
  async parseFile(file: UploadedFileDto): Promise<ParsedDocumentResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for parsing.');
    }

    // 1. Validate file size (HTTP 413)
    if (file.size > this.MAX_FILE_SIZE || file.buffer.length > this.MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `Uploaded file exceeds the maximum allowed size of 5MB (got ${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
      );
    }

    // 2. Validate file extension and MIME type
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isExtensionAllowed = this.ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = this.ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (!isExtensionAllowed && !isMimeAllowed) {
      throw new BadRequestException(
        `Unsupported file type '${ext || file.mimetype}'. Only PDF (.pdf) and DOCX (.docx) documents are supported.`,
      );
    }

    let extractedText = '';

    try {
      if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        extractedText = await this.extractPdfText(file.buffer);
      } else if (
        ext === '.docx' ||
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        extractedText = await this.extractDocxText(file.buffer);
      } else {
        throw new BadRequestException('Unsupported file format.');
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to parse document '${file.originalname}': ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof UnprocessableEntityException ||
        error instanceof PayloadTooLargeException
      ) {
        throw error;
      }
      throw new UnprocessableEntityException(
        `Failed to parse document content: ${error.message || 'Corrupted or unreadable file'}`,
      );
    }

    // 3. Normalize whitespace
    const cleanedText = this.sanitizeText(extractedText);

    // 4. Validate non-empty extraction (HTTP 422)
    if (!cleanedText || cleanedText.length < 20) {
      throw new UnprocessableEntityException(
        'Unable to extract meaningful text from the provided document. The file may be empty, image-only scanned, or corrupted.',
      );
    }

    // 5. Enforce max length constraint
    let finalContent = cleanedText;
    if (cleanedText.length > this.MAX_TEXT_LENGTH) {
      this.logger.warn(
        `Document text exceeds ${this.MAX_TEXT_LENGTH} characters. Truncating for AI prompt safety.`,
      );
      finalContent = cleanedText.substring(0, this.MAX_TEXT_LENGTH);
    }

    return {
      text: finalContent,
      filename: file.originalname,
      mimetype: file.mimetype,
      charCount: finalContent.length,
    };
  }

  /**
   * Extract text from PDF buffer using pdf-parse (supports both v1 function and v2 PDFParse class).
   */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return data?.text || '';
    }
    if (pdfModule?.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const result = await parser.getText();
      return result?.text || '';
    }
    if (pdfModule?.default && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      return data?.text || '';
    }
    throw new Error('Unable to initialize PDF parser.');
  }

  /**
   * Extract text from DOCX buffer using mammoth.
   */
  private async extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  /**
   * Normalizes multiple whitespaces, linebreaks, and control characters.
   */
  private sanitizeText(rawText: string): string {
    if (!rawText) return '';
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
