import api from './api';

export const emailService = {
  /**
   * Fetch current Gmail OAuth2 integration status from backend.
   * @returns {Promise<{authenticated: boolean, email?: string}>}
   */
  async getGmailStatus() {
    const response = await api.get('/email/gmail/status');
    return response.data;
  },

  /**
   * Returns backend Google OAuth connect URL.
   * Navigating to this URL redirects the browser to Google OAuth consent.
   * @returns {string}
   */
  getConnectUrl() {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return `${baseUrl.replace(/\/$/, '')}/email/gmail/connect`;
  },

  /**
   * Disconnects Gmail by clearing stored tokens on the backend.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async disconnectGmail() {
    const response = await api.post('/email/gmail/disconnect');
    return response.data;
  },

  /**
   * Sends a test verification email via the backend Gmail API.
   * @param {string} to - Recipient email address
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendTestEmail(to) {
    const response = await api.post('/email/test', { to });
    return response.data;
  },
};

export default emailService;
