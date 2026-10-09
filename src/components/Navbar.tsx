import React, { useState } from 'react';
import { User } from '../types/index.ts';
import {
  Calendar,
  Sparkles,
  UserCheck,
  Shield,
  GraduationCap,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ListPlus,
  Users,
  Compass,
} from 'lucide-react';
import { googleSignIn, logoutGoogle, getAccessToken } from '../lib/firebase.ts';
import { api } from '../services/api.ts';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onSwitchUser: (role: 'student' | 'admin') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAssistant: () => void;
  isGoogleConnected: boolean;
  connectedGoogleEmail?: string;
  onOpenCalendarSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onSwitchUser,
  activeTab,
  setActiveTab,
  onOpenAssistant,
  isGoogleConnected,
  connectedGoogleEmail,
  onOpenCalendarSettings,
}) => {

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  CampusPulse
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Events
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Academic Workshops & Seminar Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'student' ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'events'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Browse Events
                </button>
                <button
                  onClick={() => setActiveTab('my-registrations')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'my-registrations'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  My Registrations
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Admin Overview
                </button>
                <button
                  onClick={() => setActiveTab('manage-events')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'manage-events'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Manage Events
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'participants'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Participant Rosters
                </button>
              </>
            )}

            {/* AI Assistant Tab */}
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'assistant'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm ring-1 ring-purple-400/40'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>AI Agent</span>
            </button>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-3">
            {/* Google Calendar Status & Settings Button */}
            {isGoogleConnected ? (
              <button
                onClick={onOpenCalendarSettings}
                title={`Google Calendar Connected: ${connectedGoogleEmail || 'Active'}. Click to manage settings & test.`}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-semibold cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[130px]">{connectedGoogleEmail || 'Calendar Linked'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenCalendarSettings}
                title="Connect Google Calendar to enable 1-click scheduling"
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Connect Calendar</span>
              </button>
            )}

            {/* Role Demo Quick-Switcher */}
            <button
              onClick={() => onSwitchUser(user.role === 'student' ? 'admin' : 'student')}
              className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
              title={`Currently in ${user.role} mode. Click to test as ${user.role === 'student' ? 'Admin' : 'Student'}.`}
            >
              {user.role === 'student' ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Student Mode</span>
                  <span className="text-[10px] text-slate-400">→ Admin</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin Mode</span>
                  <span className="text-[10px] text-slate-400">→ Student</span>
                </>
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 ring-1 ring-slate-600 flex items-center justify-center text-xs font-bold text-white">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="hidden xl:block text-left text-xs">
                <div className="font-semibold text-slate-200 truncate max-w-[110px]">{user.name}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900/90 px-2 py-2 text-xs">
        {user.role === 'student' ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'events' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('my-registrations')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'my-registrations' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              My Regs
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('manage-events')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'manage-events' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-2 py-1 rounded font-medium ${activeTab === 'participants' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Rosters
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded font-semibold ${
            activeTab === 'assistant' ? 'bg-purple-600 text-white' : 'text-purple-300 bg-purple-950/30'
          }`}
        >
          <Sparkles className="w-3 h-3 text-purple-300" />
          <span>AI Agent</span>
        </button>
        <button
          onClick={onOpenCalendarSettings}
          className={`flex items-center space-x-1 px-2 py-1 rounded font-medium ${
            isGoogleConnected ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-400'
          }`}
          title="Google Calendar Integration"
        >
          <Calendar className="w-3 h-3 text-blue-400" />
          <span>Calendar</span>
        </button>
      </div>
    </header>
  );
};
