import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GmailService } from './gmail.service';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/email/gmail/connect - Generates Google OAuth authorization URL and redirects browser
   */
  @Get('gmail/connect')
  async connectGmail(@Res() res: Response) {
    const authUrl = this.gmailService.generateAuthUrl();
    return res.redirect(authUrl);
  }

  /**
   * GET /api/email/gmail/callback - Handles Google OAuth callback and redirects back to frontend
   */
  @Get('gmail/callback')
  async gmailCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    if (error || !code) {
      const errMsg = encodeURIComponent(
        error || 'Authorization failed or access was denied.',
      );
      return res.redirect(`${frontendUrl}/hr/settings?gmail=error&message=${errMsg}`);
    }

    try {
      await this.gmailService.handleCallback(code);
      return res.redirect(`${frontendUrl}/hr/settings?gmail=connected`);
    } catch (err: any) {
      const errMsg = encodeURIComponent(
        err.message || 'Failed to exchange authorization code.',
      );
      return res.redirect(`${frontendUrl}/hr/settings?gmail=error&message=${errMsg}`);
    }
  }

  /**
   * GET /api/email/gmail/status - Checks whether Gmail is currently authenticated
   */
  @Get('gmail/status')
  async getGmailStatus() {
    return this.gmailService.getStatus();
  }

  /**
   * POST /api/email/gmail/disconnect - Removes token.json and clears credentials
   */
  @Post('gmail/disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectGmail() {
    return this.gmailService.disconnect();
  }

  /**
   * POST /api/email/test - Development test endpoint to send a verification email
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() body: { to: string }) {
    if (!body?.to) {
      throw new BadRequestException('Recipient email address "to" is required.');
    }
    return this.emailService.sendTestEmail(body.to);
  }
}
