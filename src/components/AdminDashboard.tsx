import React from 'react';
import { User, CollegeEvent, Registration, DashboardStats } from '../types/index.ts';
import {
  Shield,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Sparkles,
  BookOpen,
  PieChart,
  ArrowRight,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  events: CollegeEvent[];
  registrations: Registration[];
  stats: DashboardStats | null;
  onNavigateTab: (tab: string) => void;
  onCreateEventClick: () => void;
  onOpenParticipants: (event: CollegeEvent) => void;
  onAskAI: (prompt: string) => void;
  isGoogleConnected: boolean;
  connectedGoogleEmail?: string;
  onOpenCalendarSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  events,
  registrations,
  stats,
  onNavigateTab,
  onCreateEventClick,
  onOpenParticipants,
  onAskAI,
  isGoogleConnected,
  connectedGoogleEmail,
  onOpenCalendarSettings,
}) => {
  const confirmedRegistrations = registrations.filter((r) => r.status === 'confirmed');

  return (
    <div className="space-y-8">
      {/* Admin Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-800/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Administrative Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Event Management & Academic Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Administrator: <span className="font-semibold text-white">{user.name}</span> ({user.studentId}) • {user.course}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onCreateEventClick}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-md shadow-amber-600/25 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </button>
            <button
              onClick={() => onNavigateTab('participants')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Participant Rosters</span>
            </button>
            <button
              onClick={onOpenCalendarSettings}
              className="px-4 py-2.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 text-blue-200 border border-blue-700/60 font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{isGoogleConnected ? 'Calendar Linked' : 'Connect Calendar'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>Total Events</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.totalEvents ?? events.length}</div>
            <div className="text-[11px] text-indigo-400 mt-1">Live in Firestore</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>Active Registrations</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.activeRegistrations ?? confirmedRegistrations.length}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">Confirmed student seats</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>Seat Utilization</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.capacityUtilization ?? 0}%
            </div>
            <div className="text-[11px] text-amber-400 mt-1">
              Of {stats?.totalCapacity ?? 0} total seats
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>Upcoming Events</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.upcomingEvents ?? events.length}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">Scheduled workshops</div>
          </div>
        </div>
      </div>

      {/* Admin AI Agent Action Prompts */}
      <div className="p-4 rounded-xl bg-slate-900 border border-amber-900/40 shadow-md">
        <div className="flex items-center space-x-2 text-xs font-semibold text-amber-300 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>TRY REAL ADMIN AI AGENT ACTIONS:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'Show the participant list for the workshop',
            'How many students are registered for the seminar?',
            'Which AI workshops are happening this month?',
            'Create a new workshop on Quantum Computing on 2026-11-05',
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => onAskAI(promptText)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/70 border border-slate-700 hover:border-amber-600/50 text-slate-300 hover:text-amber-200 transition-all text-left cursor-pointer"
            >
              ⚡ "{promptText}"
            </button>
          ))}
        </div>
      </div>

      {/* Event Overview & Fast Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Active Campus Events</span>
          </h2>
          <button
            onClick={() => onNavigateTab('manage-events')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>Manage All ({events.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-indigo-400 font-semibold">{evt.eventId}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                    {evt.category}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base leading-snug">{evt.name}</h3>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{evt.date} • {evt.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{evt.venue}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Enrolled:</span>
                  <span className="font-bold text-white">
                    {evt.registeredCount} / {evt.maxCapacity} participants
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center space-x-2">
                <button
                  onClick={() => onOpenParticipants(evt)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Participants ({evt.registeredCount})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Recent Student Enrollments</span>
          </h2>
          <button
            onClick={() => onNavigateTab('participants')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>Full Roster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {confirmedRegistrations.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 text-sm">
            No registrations logged yet. Students can register via the catalog or AI Agent.
          </div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Registration ID</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Registered On</th>
                    <th className="py-3 px-4">Calendar Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {confirmedRegistrations.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-medium">{r.registrationId}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{r.studentName}</div>
                        <div className="text-[11px] text-slate-500">{r.studentId} • {r.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{r.eventName}</div>
                        <div className="text-[11px] text-slate-500">{r.eventId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(r.registrationDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {r.calendarStatus === 'synced' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Synced</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            <span>{r.calendarStatus || 'Not synced'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
