import React, { useState, useEffect } from 'react';
import { User, GoogleCalendarConnectionStatus, CalendarTestResponse } from '../types/index.ts';
import { api } from '../services/api.ts';
import { googleSignIn } from '../lib/firebase.ts';
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  Play,
  Trash2,
  KeyRound,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CalendarSettingsModalProps {
  user: User;
  onClose: () => void;
  onConnectionChange: (connected: boolean, email?: string) => void;
}

export const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  user,
  onClose,
  onConnectionChange,
}) => {
  const [status, setStatus] = useState<GoogleCalendarConnectionStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Test Flow State
  const [testingFlow, setTestingFlow] = useState(false);
  const [testResults, setTestResults] = useState<CalendarTestResponse | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await api.getGoogleConnectionStatus();
      setStatus(res);
      onConnectionChange(res.connected, res.email);
    } catch (err: any) {
      setStatus({ connected: false, error: err.message });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check if returning from Google OAuth redirect with query param
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('google_oauth');
    if (oauthStatus === 'success') {
      const email = params.get('email') || undefined;
      setSuccessNotice(`Successfully connected Google Calendar account: ${email || ''}`);
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchStatus();
    } else if (oauthStatus === 'error') {
      const desc = params.get('error_desc') || 'Authorization was cancelled or failed.';
      setActionError(`Google OAuth Error: ${desc}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 1. Connect via Google OAuth 2.0 (Official Consent Screen Flow)
  const handleConnectOAuthRedirect = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const data = await api.getGoogleAuthUrl();
      if (data.url) {
        // Redirect to Google's official OAuth consent screen
        window.location.href = data.url;
      } else {
        throw new Error('Could not generate authorization URL.');
      }
    } catch (err: any) {
      console.warn('OAuth redirect error, falling back to popup:', err);
      setActionError(err.message || 'OAuth redirect initialization failed. Try instant connection.');
      setActionLoading(false);
    }
  };

  // 2. Connect via Google Popup (Token Linking)
  const handleConnectInstantPopup = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await googleSignIn();
      if (result) {
        // Link token with backend Firestore
        const linkRes = await api.linkGoogleClientToken(
          result.accessToken,
          undefined,
          result.user.email || undefined
        );
        setSuccessNotice(`Google Calendar connected: ${linkRes.email}`);
        await fetchStatus();
      }
    } catch (err: any) {
      console.error('Instant Google Sign-In error:', err);
      setActionError(err.message || 'Google Sign-In failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Disconnect and Revoke Tokens
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? This will revoke stored credentials and stop automatic calendar syncing.')) {
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await api.disconnectGoogle();
      setSuccessNotice('Google Calendar has been disconnected and authorization revoked.');
      setTestResults(null);
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to disconnect Google account.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Run End-to-End Calendar Lifecycle Test
  const handleRunLifecycleTest = async () => {
    try {
      setTestingFlow(true);
      setActionError(null);
      setTestResults(null);
      const results = await api.testCalendarFlow();
      setTestResults(results);
      // Auto-expand all steps
      const expanded: Record<string, boolean> = {};
      results.steps.forEach((s) => {
        expanded[s.step] = true;
      });
      setExpandedSteps(expanded);
    } catch (err: any) {
      setActionError(err.message || 'Calendar test run encountered an error.');
    } finally {
      setTestingFlow(false);
    }
  };

  const toggleStep = (stepName: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepName]: !prev[stepName] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2.5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Calendar className="w-4 h-4" />
          <span>Google Calendar Integration</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">Google OAuth 2.0 & Calendar Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Connect your Google account securely to sync college workshops and seminar registrations directly into your personal Google Calendar.
        </p>

        {/* Alerts */}
        {actionError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-bold">Connection Error: </span>
              <span>{actionError}</span>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Status Card */}
        <div className="mt-6 p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                Current Connection Status
              </span>
              {loadingStatus ? (
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Checking Google token status...</span>
                </div>
              ) : status.connected ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-base font-bold text-emerald-400">Google Calendar Connected</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Account: <span className="font-semibold text-white">{status.email}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Auto-refresh: {status.hasRefreshToken ? 'Enabled (Offline Refresh Token)' : 'Active Bearer Session'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="text-base font-bold text-slate-300">Google Calendar Not Connected</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sign in with your Google account to enable 1-click scheduling and calendar updates.
                  </p>
                </div>
              )}
            </div>

            {/* Connection Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {status.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Disconnecting...' : 'Disconnect Calendar'}</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleConnectInstantPopup}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{actionLoading ? 'Connecting...' : 'Connect Google Calendar'}</span>
                  </button>
                  <button
                    onClick={handleConnectOAuthRedirect}
                    disabled={actionLoading}
                    title="Launch Google's full OAuth consent redirect flow"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    OAuth Redirect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security / Architecture Guarantee */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-300 font-semibold">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Secure Backend OAuth Architecture</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>Google Client Secret and Refresh Tokens are stored strictly on the backend/database and never exposed to the frontend.</li>
            <li>The application requests only minimum calendar permissions (<code>calendar.events</code>).</li>
            <li>Passwords are never requested or stored; tokens are revoked upon disconnecting.</li>
          </ul>
        </div>

        {/* End-to-End Calendar Lifecycle Test Section */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Test Complete Google Calendar Lifecycle</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Verifies real Google API operations: Verify Token → Create Event → Retrieve Event → Update Event → Delete Event.
              </p>
            </div>

            <button
              onClick={handleRunLifecycleTest}
              disabled={testingFlow || !status.connected}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                status.connected
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              {testingFlow ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing API Calls...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Lifecycle Test</span>
                </>
              )}
            </button>
          </div>

          {!status.connected && (
            <p className="text-xs text-amber-400/90 bg-amber-950/40 p-3 rounded-xl border border-amber-900/50">
              ⚠️ Please connect your Google Calendar account above first to execute the live Google API lifecycle test.
            </p>
          )}

          {/* Test Results Output */}
          {testResults && (
            <div className="space-y-3 mt-4">
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                  testResults.success
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                    : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                }`}
              >
                {testResults.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResults.summary}</span>
              </div>

              <div className="space-y-2">
                {testResults.steps.map((st) => {
                  const isExp = !!expandedSteps[st.step];
                  return (
                    <div
                      key={st.step}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden text-xs"
                    >
                      <button
                        onClick={() => toggleStep(st.step)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          {st.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="font-bold text-white">{st.step}</span>
                          <span className="text-slate-400 text-[11px] truncate max-w-xs">{st.message}</span>
                        </div>
                        {isExp ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isExp && (
                        <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono space-y-1.5">
                          <div className="text-slate-300">{st.message}</div>
                          {st.payload && (
                            <pre className="text-emerald-300 bg-slate-950 p-2.5 rounded-lg overflow-x-auto">
                              {JSON.stringify(st.payload, null, 2)}
                            </pre>
                          )}
                          {st.error && (
                            <div className="text-rose-400 font-bold bg-rose-950/60 p-2 rounded-lg border border-rose-900">
                              Error: {st.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
