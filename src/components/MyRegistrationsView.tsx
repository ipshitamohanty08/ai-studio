import React, { useState } from 'react';
import { Registration, CollegeEvent, User } from '../types/index.ts';
import {
  CalendarCheck,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface MyRegistrationsViewProps {
  user: User;
  registrations: Registration[];
  events: CollegeEvent[];
  onCancelRegistration: (registrationId: string) => void;
  onResyncCalendar: (registrationId: string) => void;
  onBrowseEvents: () => void;
  cancellingId: string | null;
  resyncingId: string | null;
}

export const MyRegistrationsView: React.FC<MyRegistrationsViewProps> = ({
  user,
  registrations,
  events,
  onCancelRegistration,
  onResyncCalendar,
  onBrowseEvents,
  cancellingId,
  resyncingId,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('confirmed');

  const filteredRegistrations = registrations.filter((r) => {
    if (filter === 'confirmed') return r.status === 'confirmed';
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Event Registrations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your workshop enrollments, calendar schedule synchronizations, and registration history.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'confirmed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({registrations.filter((r) => r.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'cancelled' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cancelled ({registrations.filter((r) => r.status === 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All History ({registrations.length})
          </button>
        </div>
      </div>

      {filteredRegistrations.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No {filter} registrations found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Explore available campus events to enroll in academic seminars and hands-on workshops.
          </p>
          <button
            onClick={onBrowseEvents}
            className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Browse Workshop Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((reg) => {
            const isConfirmed = reg.status === 'confirmed';
            const isCancelling = cancellingId === reg.registrationId || cancellingId === reg.id;
            const isResyncing = resyncingId === reg.registrationId || resyncingId === reg.id;

            return (
              <div
                key={reg.id}
                className={`p-6 rounded-2xl border transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  isConfirmed
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/70 border-slate-900 opacity-75'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40">
                      {reg.eventId}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmed Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Cancelled</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Ref: {reg.registrationId}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">{reg.eventName}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 pt-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{reg.eventDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{reg.eventTime}</span>
                    </div>
                    <div className="flex items-center space-x-2 sm:col-span-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{reg.eventVenue}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Registered on: {new Date(reg.registrationDate).toLocaleString()}
                  </div>
                </div>

                {/* Right Side: Google Calendar status and Cancel button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                  {/* Google Calendar Link / Sync Status */}
                  {reg.calendarStatus === 'synced' && reg.calendarLink ? (
                    <a
                      href={reg.calendarLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>View in Calendar</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : isConfirmed ? (
                    <button
                      onClick={() => onResyncCalendar(reg.id)}
                      disabled={isResyncing}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      {isResyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span>{isResyncing ? 'Syncing...' : 'Sync to Calendar'}</span>
                    </button>
                  ) : null}

                  {/* Cancel Button */}
                  {isConfirmed && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel your registration for '${reg.eventName}'?`)) {
                          onCancelRegistration(reg.id);
                        }
                      }}
                      disabled={isCancelling}
                      className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isCancelling ? 'Cancelling...' : 'Cancel Seat'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
