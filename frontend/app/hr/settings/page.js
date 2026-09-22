'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Section: Email Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Settings & Integrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure OAuth2 connections, email delivery, and platform notifications.
          </p>
        </div>
      </div>

      {/* Gmail Integration Card */}
      <div className="exec-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Gmail Integration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Google OAuth2 + Gmail API (gmail.send)
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Status:
            </span>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Checking...
              </span>
            ) : status.authenticated ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Details Body */}
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : status.authenticated ? (
          <div className="space-y-6">
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <p className="font-bold text-sm text-emerald-950">
                  Gmail is connected and ready to send emails
                </p>
                <p className="text-emerald-800 leading-relaxed font-normal">
                  Interview invitations dispatched from candidate profiles will be sent directly through your authorized Gmail account via the official Google Gmail API.
                </p>
                {status.email && (
                  <p className="font-semibold text-emerald-950 pt-1">
                    Authorized Account: <span className="font-mono text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200/60">{status.email}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleConnectGmail}
                className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reconnect Gmail</span>
              </Button>

              <Button
                variant="danger"
                onClick={handleDisconnect}
                isLoading={disconnecting}
                className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </Button>
            </div>

            {/* Developer Verification Test Section */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Send Verification Test Email
              </h4>
              <p className="text-xs text-slate-500 font-medium">
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
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={sendingTest}
                  className="flex items-center justify-center gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Test</span>
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-slate-900">
                Connect Gmail to send interview invitations
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Authorize RecruitFlow to send candidate technical evaluation emails to assigned reviewers. You will be redirected to Google to grant the secure <span className="font-mono bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">gmail.send</span> scope.
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                onClick={handleConnectGmail}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Connect Gmail</span>
              </Button>
            </div>
          </div>
        )}
      </div>

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
