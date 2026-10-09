import React from 'react';
import { CollegeEvent, Registration, User } from '../types/index.ts';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface EventDetailsModalProps {
  event: CollegeEvent | null;
  onClose: () => void;
  user: User;
  registrations: Registration[];
  onRegister: (event: CollegeEvent) => void;
  registeringEventId: string | null;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  onClose,
  user,
  registrations,
  onRegister,
  registeringEventId,
}) => {
  if (!event) return null;

  const confirmed = registrations.find((r) => r.eventId === event.eventId && r.status === 'confirmed');
  const isRegistered = !!confirmed;
  const isFull = event.registeredCount >= event.maxCapacity;
  const seatsRemaining = Math.max(0, event.maxCapacity - event.registeredCount);
  const fillPercent = Math.min(100, Math.round((event.registeredCount / event.maxCapacity) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tags */}
        <div className="flex items-center space-x-2.5 mb-3">
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30">
            {event.category || 'Workshop'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
            {event.eventId}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
          {event.name}
        </h2>

        {/* Key Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
          <div className="flex items-center space-x-2.5 text-slate-300">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Date</span>
              <span>{event.date}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-300">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Time Range</span>
              <span>{event.time}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-300 sm:col-span-2">
            <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Campus Venue</span>
              <span>{event.venue}</span>
            </div>
          </div>
        </div>

        {/* Description / Agenda */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Event Agenda & Overview</h4>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            {event.description}
          </p>
        </div>

        {/* Capacity Bar */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-400 font-medium">Participant Capacity</span>
            <span className={isFull ? 'text-rose-400 font-bold' : 'text-slate-200'}>
              {event.registeredCount} / {event.maxCapacity} Seats ({seatsRemaining} Available)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-rose-500' : fillPercent > 75 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Registered status / Action */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>

          {user.role === 'student' && (
            isRegistered ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-4 py-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                <span>You are registered ({confirmed?.registrationId})</span>
              </div>
            ) : isFull ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 bg-rose-950/70 border border-rose-800/60 px-4 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
                <span>Event Full (Capacity Reached)</span>
              </div>
            ) : (
              <button
                onClick={() => onRegister(event)}
                disabled={registeringEventId === event.eventId}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center space-x-2"
              >
                <span>{registeringEventId === event.eventId ? 'Registering...' : 'Register for Event'}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
