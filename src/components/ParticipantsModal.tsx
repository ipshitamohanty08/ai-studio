import React, { useState, useEffect } from 'react';
import { CollegeEvent, ParticipantInfo } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ParticipantsModalProps {
  event: CollegeEvent | null;
  onClose: () => void;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ event, onClose }) => {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!event) return;
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getEventParticipants(event.eventId);
        setParticipants(res.participants || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load participants');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [event]);

  if (!event) return null;

  const filtered = participants.filter(
    (p) =>
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Participant Roster</span>
        </div>
        <h2 className="text-xl font-bold text-white">{event.name}</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Event ID: <span className="font-mono text-indigo-300">{event.eventId}</span> • {event.date} ({event.time})
        </p>

        {/* Enrollment Progress Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Confirmed Participants</span>
            <span className="text-xl font-black text-white">{participants.length} / {event.maxCapacity}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">Availability</span>
            <span className="text-sm font-bold text-emerald-400">
              {Math.max(0, event.maxCapacity - participants.length)} seats remaining
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student by name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Table / Content */}
        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Fetching participant records from Firebase...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              {participants.length === 0
                ? 'No students are currently registered for this event.'
                : 'No participants match your search query.'}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Registration ID</th>
                      <th className="py-2.5 px-3">Enrolled At</th>
                      <th className="py-2.5 px-3">Calendar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map((p) => (
                      <tr key={p.registrationId} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{p.studentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.studentId}</div>
                          <div className="text-[10px] text-slate-500">{p.studentEmail}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-indigo-300 text-[11px]">
                          {p.registrationId}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {new Date(p.registrationDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          {p.calendarStatus === 'synced' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Synced</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Not synced</span>
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

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
