'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import emailService from '@/services/emailService';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ authenticated: false, email: null });
  const [disconnecting, setDisconnecting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await emailService.getGmailStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
      setStatus({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check query parameters from OAuth callback redirect
    const gmailParam = searchParams.get('gmail');
    const messageParam = searchParams.get('message');

    if (gmailParam === 'connected') {
      setToast({
        message: 'Gmail account successfully connected and authorized!',
        type: 'success',
      });
    } else if (gmailParam === 'error') {
      setToast({
        message: messageParam
          ? decodeURIComponent(messageParam)
          : 'Gmail authorization failed. Please try again.',
        type: 'error',
      });
    }
  }, [searchParams]);

  const handleConnectGmail = () => {
    // Navigate to the backend OAuth initiation endpoint
    window.location.href = emailService.getConnectUrl();
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disconnect your Gmail integration? Interview invitation emails will be disabled until reconnected.',
      )
    ) {
      return;
    }

    try {
      setDisconnecting(true);
      await emailService.disconnectGmail();
      setStatus({ authenticated: false });
      setToast({
        message: 'Gmail account successfully disconnected.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
      setToast({
        message:
          err.response?.data?.message || 'Failed to disconnect Gmail account.',
        type: 'error',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setToast({
        message: 'Please enter a valid email address for the test.',
        type: 'error',
      });
      return;
    }

    try {
      setSendingTest(true);
      await emailService.sendTestEmail(testEmail.trim());
      setToast({
        message: `Test email successfully sent to ${testEmail}!`,
        type: 'success',
      });
      setTestEmail('');
    } catch (err) {
      console.error('Failed to send test email:', err);
      setToast({
        message:
          err.response?.data?.message ||
          'Failed to send test email. Please check your Gmail connection.',
        type: 'error',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      <Header
        title="Settings"
        subtitle="Manage OAuth2 integrations and platform configurations"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Section: Email Settings */}
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
            Email Settings
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Configure how RecruitFlow delivers interview invitations to Tech Leads
          </p>
        </div>

        {/* Gmail Integration Card */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-950">
                  Gmail Integration
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Google OAuth2 + Gmail API (gmail.send)
                </p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Status:
              </span>
              {loading ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking...
                </span>
              ) : status.authenticated ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Details Body */}
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : status.authenticated ? (
            <div className="space-y-6">
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 space-y-1">
                  <p className="font-bold text-sm">
                    Gmail is connected and ready to send emails
                  </p>
                  <p className="text-emerald-700">
                    Interview invitations dispatched from candidate profiles will be sent directly through your authorized Gmail account via the official Google Gmail API.
                  </p>
                  {status.email && (
                    <p className="font-semibold text-emerald-950 pt-1">
                      Authorized Account: <span className="font-mono">{status.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleConnectGmail}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reconnect Gmail</span>
                </Button>

                <Button
                  variant="danger"
                  onClick={handleDisconnect}
                  isLoading={disconnecting}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </Button>
              </div>

              {/* Developer Verification Test Section */}
              <div className="pt-6 border-t border-zinc-100 space-y-3">
                <h4 className="text-sm font-bold text-zinc-900">
                  Send Verification Test Email
                </h4>
                <p className="text-xs text-zinc-500">
                  Verify that your Gmail API connection can deliver messages without errors.
                </p>

                <form
                  onSubmit={handleSendTestEmail}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg"
                >
                  <input
                    type="email"
                    placeholder="Enter test recipient email..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={sendingTest}
                    className="flex items-center justify-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Test</span>
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-5 space-y-2">
                <h4 className="text-sm font-bold text-zinc-900">
                  Connect Gmail to send interview invitations
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Authorize RecruitFlow to send candidate technical evaluation emails to assigned Tech Leads. You will be redirected to Google to grant the secure <span className="font-mono bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800">gmail.send</span> scope.
                </p>
              </div>

              <div>
                <Button
                  variant="primary"
                  onClick={handleConnectGmail}
                  className="flex items-center gap-2 px-5 py-2.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Connect Gmail</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
