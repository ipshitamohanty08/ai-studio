import React, { useState } from 'react';
import { CollegeEvent, Registration, User } from '../types/index.ts';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
} from 'lucide-react';

interface EventsViewProps {
  events: CollegeEvent[];
  user: User;
  registrations: Registration[];
  onOpenEventDetails: (event: CollegeEvent) => void;
  onRegister: (event: CollegeEvent) => void;
  registeringEventId: string | null;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  user,
  registrations,
  onOpenEventDetails,
  onRegister,
  registeringEventId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const confirmedRegistrations = registrations.filter((r) => r.status === 'confirmed');
  const registeredEventIds = new Set(confirmedRegistrations.map((r) => r.eventId));

  const categories = ['All', 'Artificial Intelligence', 'Business & Analytics', 'Cloud Computing', 'Cybersecurity', 'Career & Leadership'];

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.eventId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || evt.category === selectedCategory;
    const isFull = evt.registeredCount >= evt.maxCapacity;
    const matchesAvailability = !onlyAvailable || !isFull;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Academic Workshops & Events</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover upcoming departmental conferences, masterclasses, and hands-on technical labs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by topic, speaker, hall..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span>Seats Available Only</span>
        </label>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No matching events found</h3>
          <p className="text-xs text-slate-400 mt-1">Try altering your search keywords or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const isRegistered = registeredEventIds.has(evt.eventId);
            const isFull = evt.registeredCount >= evt.maxCapacity;
            const seatsRemaining = Math.max(0, evt.maxCapacity - evt.registeredCount);
            const fillPercent = Math.min(100, Math.round((evt.registeredCount / evt.maxCapacity) * 100));
            const isRegisteringThis = registeringEventId === evt.eventId;

            return (
              <div
                key={evt.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between shadow-xl group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px]">
                      {evt.category || 'Workshop'}
                    </span>
                    <span className="font-mono text-slate-400 font-bold text-[11px]">{evt.eventId}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                    {evt.name}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="mt-5 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center space-x-2.5">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{evt.time}</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="line-clamp-1">{evt.venue}</span>
                    </div>
                  </div>

                  {/* Seat Capacity Progress */}
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-400">Enrollment</span>
                      <span className={isFull ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {evt.registeredCount} / {evt.maxCapacity} seats ({seatsRemaining} remaining)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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

                {/* Actions */}
                <div className="mt-6 pt-3 flex items-center space-x-2">
                  {user.role === 'student' ? (
                    isRegistered ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Registered (Active)</span>
                      </div>
                    ) : isFull ? (
                      <div className="w-full py-2.5 rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs font-bold flex items-center justify-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Maximum Capacity Reached</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onRegister(evt)}
                          disabled={isRegisteringThis}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          {isRegisteringThis ? (
                            <span>Processing...</span>
                          ) : (
                            <span>Register Seat</span>
                          )}
                        </button>
                        <button
                          onClick={() => onOpenEventDetails(evt)}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </>
                    )
                  ) : (
                    <button
                      onClick={() => onOpenEventDetails(evt)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>View Specifications</span>
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
