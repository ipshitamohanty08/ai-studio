import React, { useState } from 'react';
import { User } from '../types/index.ts';
import { googleSignIn } from '../lib/firebase.ts';
import { api } from '../services/api.ts';
import {
  GraduationCap,
  Shield,
  Sparkles,
  Calendar,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  User as UserIcon,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onGoogleConnected: (connected: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onGoogleConnected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentIdInput, setStudentIdInput] = useState('');

  const handleDemoStudentLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.login('STU-2026-001', 'student');
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as student');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.login('ADMIN-001', 'admin');
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const user = await api.login(studentIdInput.trim(), 'student');
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await googleSignIn();
      if (res) {
        onGoogleConnected(true);
        const syncedUser = await api.syncGoogleUser({
          email: res.user.email || '',
          displayName: res.user.displayName || undefined,
          photoURL: res.user.photoURL || undefined,
          uid: res.user.uid,
        });
        if (res.accessToken) {
          try {
            await api.linkGoogleClientToken(res.accessToken, undefined, res.user.email || undefined);
          } catch (tokenErr) {
            console.warn('Could not immediately link Google token to backend:', tokenErr);
          }
        }
        onLoginSuccess(syncedUser);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(err.message || 'Google Sign-In failed. Please try demo accounts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        {/* Brand Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-2 ring-white/20 mb-4">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
          CampusPulse
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto font-medium">
          College Academic Event Management System with AI Agent & Google Calendar Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-sm flex items-start space-x-2">
              <span className="font-semibold text-rose-400">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins Section */}
          <div className="space-y-3 mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              ⚡ Instant 1-Click Evaluation Logins
            </div>

            <button
              onClick={handleDemoStudentLogin}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-900/70 to-blue-900/70 hover:from-indigo-800/80 hover:to-blue-800/80 border border-indigo-700/60 text-left transition-all group shadow-sm hover:shadow-indigo-500/10 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Student Access</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-normal">
                      Demo: Alex Rivera
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">B.S. Computer Science & AI • STU-2026-001</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleDemoAdminLogin}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-800/80 hover:from-amber-900/70 hover:to-slate-700/80 border border-amber-700/50 text-left transition-all group shadow-sm hover:shadow-amber-500/10 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Admin Access</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-normal">
                      Demo: Prof. Marcus Vance
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Department of Computing • ADMIN-001</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                Or Continue With Google
              </span>
            </div>
          </div>

          {/* Official Styled Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium text-sm transition-all shadow-sm hover:border-slate-600 cursor-pointer"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Sign in with Google (Enables Calendar Sync)</span>
          </button>

          {/* Custom Student ID Form */}
          <form onSubmit={handleCustomLogin} className="mt-6 pt-5 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Enter Custom Student ID (Optional)
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. STU-2026-099"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={!studentIdInput.trim() || loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Enter
              </button>
            </div>
          </form>

          {/* System Capability Badges */}
          <div className="mt-8 grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/40">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Firebase Firestore DB</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/40">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Gemini AI Tool Calling</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/40">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Google Calendar API</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/40">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Strict Duplicate Guards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
