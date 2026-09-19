import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

export interface GmailStatus {
  authenticated: boolean;
  email?: string;
}

@Injectable()
export class GmailService implements OnModuleInit {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client | null = null;
  private credentialsPath: string;
  private tokenPath: string;
  private redirectUri: string;
  private isConfigured = false;
  private isAuthenticated = false;
  private userEmail: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const rawCredsPath =
      this.configService.get<string>('GOOGLE_CREDENTIALS_PATH') ||
      './credentials.json';
    const rawTokenPath =
      this.configService.get<string>('GOOGLE_TOKEN_PATH') || './token.json';

    this.credentialsPath = path.isAbsolute(rawCredsPath)
      ? rawCredsPath
      : path.resolve(process.cwd(), rawCredsPath);

    this.tokenPath = path.isAbsolute(rawTokenPath)
      ? rawTokenPath
      : path.resolve(process.cwd(), rawTokenPath);

    const port = this.configService.get<number>('PORT', 5000);
    this.redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      `http://localhost:${port}/api/email/gmail/callback`;
  }

  onModuleInit() {
    this.initializeOAuthClient();
  }

  /**
   * Initializes OAuth2 client using credentials.json and existing token.json if present.
   * Does not throw on missing files so backend starts cleanly even before Gmail is configured.
   */
  public initializeOAuthClient(): void {
    try {
      this.logger.log('[Gmail] Initializing OAuth client');

      if (!fs.existsSync(this.credentialsPath)) {
        this.logger.warn(
          `[Gmail] Credentials file not found at ${this.credentialsPath}. Gmail integration will be unavailable until credentials.json is provided.`,
        );
        this.isConfigured = false;
        this.isAuthenticated = false;
        return;
      }

      const fileContent = fs.readFileSync(this.credentialsPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const clientConfig = parsed.installed || parsed.web || parsed;

      const clientId = clientConfig.client_id;
      const clientSecret = clientConfig.client_secret;

      if (!clientId || !clientSecret) {
        this.logger.error(
          '[Gmail] Invalid credentials.json format: missing client_id or client_secret.',
        );
        this.isConfigured = false;
        this.isAuthenticated = false;
        return;
      }

      // Determine redirect URI: use configured env, or first matching non-root redirect URI from credentials, or fallback
      let redirectUri = this.redirectUri;
      if (
        clientConfig.redirect_uris &&
        Array.isArray(clientConfig.redirect_uris) &&
        clientConfig.redirect_uris.length > 0
      ) {
        const callbackUri = clientConfig.redirect_uris.find((u: string) =>
          u.includes('/api/email/gmail/callback'),
        );
        if (callbackUri) {
          redirectUri = callbackUri;
        }
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );

      // Listen for token refresh events and update token.json automatically
      this.oauth2Client.on('tokens', (newTokens) => {
        this.logger.log('[Gmail] Access token refreshed by Google OAuth');
        this.persistRefreshedTokens(newTokens);
      });

      this.isConfigured = true;

      // Check if token.json already exists
      this.loadExistingToken();
    } catch (err: any) {
      this.logger.error(
        `[Gmail] Error initializing OAuth client: ${err.message}`,
      );
      this.isConfigured = false;
      this.isAuthenticated = false;
    }
  }

  /**
   * Loads token.json if present and applies it to OAuth2 client.
   */
  private loadExistingToken(): void {
    if (!this.oauth2Client) return;

    if (!fs.existsSync(this.tokenPath)) {
      this.logger.log(
        `[Gmail] Token file not found at ${this.tokenPath}. Gmail authentication required via /api/email/gmail/connect.`,
      );
      this.isAuthenticated = false;
      return;
    }

    try {
      const tokenContent = fs.readFileSync(this.tokenPath, 'utf-8');
      const tokens = JSON.parse(tokenContent);

      if (!tokens.access_token && !tokens.refresh_token) {
        this.logger.warn('[Gmail] Token file does not contain valid tokens.');
        this.isAuthenticated = false;
        return;
      }

      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      this.logger.log('[Gmail] Token loaded');
      this.logger.log('[Gmail] Gmail authentication successful');

      // Attempt to retrieve associated account email safely from token info if possible
      this.fetchUserEmailAsync();
    } catch (err: any) {
      this.logger.warn(
        `[Gmail] Could not parse existing token file: ${err.message}`,
      );
      this.isAuthenticated = false;
    }
  }

  /**
   * Persists tokens to token.json without wiping out existing refresh_token.
   */
  private saveTokenToFile(tokens: any): void {
    try {
      let existingTokens: any = {};
      if (fs.existsSync(this.tokenPath)) {
        try {
          existingTokens = JSON.parse(
            fs.readFileSync(this.tokenPath, 'utf-8'),
          );
        } catch (_) {}
      }

      const mergedTokens = {
        ...existingTokens,
        ...tokens,
      };

      // Ensure directory exists
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.tokenPath,
        JSON.stringify(mergedTokens, null, 2),
        'utf-8',
      );
      this.logger.log(`[Gmail] Saved token information to ${this.tokenPath}`);
    } catch (err: any) {
      this.logger.error(`[Gmail] Failed to write token file: ${err.message}`);
    }
  }

  private persistRefreshedTokens(newTokens: any): void {
    if (!this.oauth2Client) return;
    const currentCreds = this.oauth2Client.credentials || {};
    const merged = {
      ...currentCreds,
      ...newTokens,
    };
    this.saveTokenToFile(merged);
  }

  private async fetchUserEmailAsync(): Promise<void> {
    if (!this.oauth2Client || !this.oauth2Client.credentials?.access_token) return;
    try {
      const tokenInfo = await this.oauth2Client.getTokenInfo(
        this.oauth2Client.credentials.access_token,
      );
      if (tokenInfo && tokenInfo.email) {
        this.userEmail = tokenInfo.email;
      }
    } catch (_) {
      // Ignored: tokenInfo may fail or email scope might not be present
    }
  }

  /**
   * Generates Google OAuth2 authorization URL with offline access and gmail.send scope.
   */
  public generateAuthUrl(): string {
    if (!this.isConfigured || !this.oauth2Client) {
      this.initializeOAuthClient();
      if (!this.isConfigured || !this.oauth2Client) {
        throw new BadRequestException(
          'Google OAuth credentials are not properly configured. Please check credentials.json.',
        );
      }
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Crucial to ensure Google issues a refresh_token
      scope: ['https://www.googleapis.com/auth/gmail.send'],
    });

    return authUrl;
  }

  /**
   * Exchanges authorization code for access and refresh tokens, saves token.json, and initializes credentials.
   */
  public async handleCallback(code: string): Promise<void> {
    if (!this.oauth2Client) {
      this.initializeOAuthClient();
      if (!this.oauth2Client) {
        throw new BadRequestException('OAuth client is not initialized.');
      }
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokenToFile(tokens);

      this.isAuthenticated = true;
      this.logger.log('[Gmail] Token loaded');
      this.logger.log('[Gmail] Gmail authentication successful');

      await this.fetchUserEmailAsync();
    } catch (err: any) {
      this.logger.error(
        `[Gmail] Failed to exchange authorization code: ${err.message}`,
      );
      this.isAuthenticated = false;
      throw new BadRequestException(
        'Failed to exchange authorization code with Google. Please try reconnecting.',
      );
    }
  }

  /**
   * Returns whether Gmail is currently authenticated.
   */
  public async getStatus(): Promise<GmailStatus> {
    if (!this.isConfigured || !this.oauth2Client) {
      this.initializeOAuthClient();
    }

    if (!fs.existsSync(this.tokenPath)) {
      this.isAuthenticated = false;
      return { authenticated: false };
    }

    if (!this.oauth2Client?.credentials?.access_token) {
      this.loadExistingToken();
    }

    if (!this.isAuthenticated || !this.oauth2Client?.credentials?.access_token) {
      return { authenticated: false };
    }

    // Proactively verify / refresh if expired
    try {
      const expiry = this.oauth2Client.credentials.expiry_date;
      if (expiry && expiry <= Date.now() + 60000) {
        // Token is close to expiring or expired, refresh it
        this.logger.log('[Gmail] Access token near expiration, requesting refresh...');
        const res = await this.oauth2Client.getAccessToken();
        if (!res.token) {
          this.isAuthenticated = false;
          return { authenticated: false };
        }
      }
      return {
        authenticated: true,
        email: this.userEmail || undefined,
      };
    } catch (err: any) {
      this.logger.warn(`[Gmail] Status check failed: ${err.message}`);
      if (
        err.message?.includes('invalid_grant') ||
        err.message?.includes('revoked')
      ) {
        this.isAuthenticated = false;
        return { authenticated: false };
      }
      return { authenticated: this.isAuthenticated };
    }
  }

  /**
   * Disconnects Gmail by removing token.json and clearing OAuth2 credentials.
   * Does NOT remove credentials.json.
   */
  public async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
      if (this.oauth2Client) {
        try {
          if (this.oauth2Client.credentials?.access_token) {
            await this.oauth2Client.revokeCredentials();
          }
        } catch (_) {
          // Token revocation may fail if already invalid; safe to ignore
        }
        this.oauth2Client.setCredentials({});
      }
      this.isAuthenticated = false;
      this.userEmail = null;
      this.logger.log('[Gmail] Disconnected and token.json removed.');
      return { success: true, message: 'Gmail disconnected' };
    } catch (err: any) {
      this.logger.error(`[Gmail] Disconnect error: ${err.message}`);
      return { success: true, message: 'Gmail disconnected' };
    }
  }

  /**
   * Sends a plain-text email using the Gmail API (gmail.users.messages.send).
   */
  public async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const status = await this.getStatus();
    if (!status.authenticated || !this.oauth2Client) {
      throw new BadRequestException('Gmail account is not connected');
    }

    try {
      this.logger.log(`[Gmail] Sending interview invitation`);

      // Construct RFC 2822 compliant message
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const emailLines = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body,
      ];
      const rawMessage = emailLines.join('\r\n');
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      this.logger.log(
        `[Gmail] Email sent successfully (Message ID: ${res.data.id})`,
      );

      return {
        success: true,
        messageId: res.data.id || undefined,
      };
    } catch (err: any) {
      this.logger.error(`[Gmail] Error sending email: ${err.message}`);

      if (
        err.message?.includes('invalid_grant') ||
        err.message?.includes('Token has been expired or revoked')
      ) {
        this.isAuthenticated = false;
        throw new BadRequestException(
          'Gmail authorization has expired. Please reconnect Gmail.',
        );
      }

      if (err.message?.includes('Gmail account is not connected')) {
        throw err;
      }

      throw new BadRequestException('Unable to send email. Please try again.');
    }
  }
}
