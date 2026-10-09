import React from 'react';
import { User, CollegeEvent, Registration } from '../types/index.ts';
import {
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  ExternalLink,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  events: CollegeEvent[];
  registrations: Registration[];
  onNavigateTab: (tab: string) => void;
  onOpenEventDetails: (event: CollegeEvent) => void;
  onQuickRegister: (event: CollegeEvent) => void;
  onAskAI: (prompt: string) => void;
  isGoogleConnected: boolean;
  connectedGoogleEmail?: string;
  onOpenCalendarSettings: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  events,
  registrations,
  onNavigateTab,
  onOpenEventDetails,
  onQuickRegister,
  onAskAI,
  isGoogleConnected,
  connectedGoogleEmail,
  onOpenCalendarSettings,
}) => {
  const confirmedRegistrations = registrations.filter((r) => r.status === 'confirmed');
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter((e) => e.date >= today);

  const registeredEventIds = new Set(confirmedRegistrations.map((r) => r.eventId));

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/80 via-slate-900 to-slate-900 border border-indigo-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Academic Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {user.course} • ID: <span className="font-mono text-indigo-300">{user.studentId}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('events')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Catalog</span>
            </button>
            <button
              onClick={() => onNavigateTab('assistant')}
              className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/70 border border-purple-500/40 text-purple-200 font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span>Ask AI Agent</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{confirmedRegistrations.length}</div>
              <div className="text-xs text-slate-400 font-medium">Registered Events</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{upcomingEvents.length}</div>
              <div className="text-xs text-slate-400 font-medium">Upcoming Workshops</div>
            </div>
          </div>

          <div
            onClick={onOpenCalendarSettings}
            className="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center space-x-1.5">
                  {isGoogleConnected ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" /> <span>Connected</span>
                    </span>
                  ) : (
                    <span className="text-amber-400">Not Connected</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-medium truncate max-w-[150px]">
                  {isGoogleConnected && connectedGoogleEmail ? connectedGoogleEmail : 'Click to connect Google'}
                </div>
              </div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 font-semibold border border-blue-500/20 group-hover:bg-blue-500/20">
              Settings & Test
            </div>
          </div>
        </div>
      </div>

      {/* Quick AI Prompts Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-purple-900/30 shadow-md">
        <div className="flex items-center space-x-2 text-xs font-semibold text-purple-300 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>TRY REAL AI AGENT ACTIONS:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'Register me for the AI workshop',
            'Am I registered for the business analytics workshop?',
            'Which AI workshops are happening this month?',
            'Show my registered events',
            'How many students have registered for the cloud seminar?',
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => onAskAI(promptText)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-950/70 border border-slate-700 hover:border-purple-600/50 text-slate-300 hover:text-purple-200 transition-all text-left cursor-pointer"
            >
              💬 "{promptText}"
            </button>
          ))}
        </div>
      </div>

      {/* Your Upcoming Registered Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Your Registered Events</h2>
          </div>
          {confirmedRegistrations.length > 0 && (
            <button
              onClick={() => onNavigateTab('my-registrations')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({confirmedRegistrations.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {confirmedRegistrations.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">You haven't registered for any events yet.</p>
            <p className="text-xs text-slate-500 mt-1">Browse the catalog below or ask the AI Assistant to register you!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmedRegistrations.slice(0, 3).map((reg) => (
              <div
                key={reg.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-emerald-900/40 hover:border-emerald-700/60 transition-all shadow-md relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-emerald-400 font-semibold">{reg.eventId}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] uppercase">
                      Confirmed
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-1">{reg.eventName}</h3>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{reg.eventDate} • {reg.eventTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="line-clamp-1">{reg.eventVenue}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                    {reg.registrationId}
                  </span>
                  {reg.calendarLink ? (
                    <a
                      href={reg.calendarLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
                    >
                      <span>Calendar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Sync available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available / Recommended Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Upcoming College Workshops & Seminars</h2>
          </div>
          <button
            onClick={() => onNavigateTab('events')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingEvents.slice(0, 6).map((evt) => {
            const isRegistered = registeredEventIds.has(evt.eventId);
            const isFull = evt.registeredCount >= evt.maxCapacity;
            const seatsRemaining = Math.max(0, evt.maxCapacity - evt.registeredCount);
            const fillPercent = Math.min(100, Math.round((evt.registeredCount / evt.maxCapacity) * 100));

            return (
              <div
                key={evt.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium text-[11px]">
                      {evt.category || 'Workshop'}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px] font-semibold">{evt.eventId}</span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-indigo-300">
                    {evt.name}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{evt.date} • {evt.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="line-clamp-1">{evt.venue}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex justify-between text-[11px] mb-1 font-medium">
                      <span className="text-slate-400">Capacity</span>
                      <span className={isFull ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {evt.registeredCount} / {evt.maxCapacity} seats ({seatsRemaining} left)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull
                            ? 'bg-rose-500'
                            : fillPercent > 75
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center space-x-2 pt-2">
                  {isRegistered ? (
                    <div className="w-full py-2 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Already Registered</span>
                    </div>
                  ) : isFull ? (
                    <div className="w-full py-2 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>At Capacity</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onQuickRegister(evt)}
                        className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => onOpenEventDetails(evt)}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
