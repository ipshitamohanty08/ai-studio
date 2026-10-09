import React, { useState } from 'react';
import { CollegeEvent, User } from '../types/index.ts';
import {
  PlusCircle,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Clock,
  MapPin,
  X,
  Check,
  Search,
  AlertCircle,
} from 'lucide-react';

interface EventManagementViewProps {
  events: CollegeEvent[];
  user: User;
  onCreateEvent: (eventData: Partial<CollegeEvent>) => Promise<void>;
  onUpdateEvent: (eventId: string, updates: Partial<CollegeEvent>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onOpenParticipants: (event: CollegeEvent) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

export const EventManagementView: React.FC<EventManagementViewProps> = ({
  events,
  user,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenParticipants,
  showCreateModal,
  setShowCreateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState<CollegeEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    eventId: '',
    name: '',
    description: '',
    date: '2026-10-30',
    time: '14:00 - 16:30',
    venue: '',
    maxCapacity: 30,
    category: 'Artificial Intelligence',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setFormData({
      eventId: `EVT-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      description: '',
      date: '2026-10-30',
      time: '14:00 - 16:30',
      venue: 'Academic Hall 1',
      maxCapacity: 30,
      category: 'Artificial Intelligence',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (evt: CollegeEvent) => {
    setEditingEvent(evt);
    setFormData({
      eventId: evt.eventId,
      name: evt.name,
      description: evt.description,
      date: evt.date,
      time: evt.time,
      venue: evt.venue,
      maxCapacity: evt.maxCapacity,
      category: evt.category || 'General',
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.eventId.trim() || !formData.name.trim() || !formData.venue.trim()) {
      setFormError('Event ID, Name, and Venue are required.');
      return;
    }
    if (!formData.date || !formData.time) {
      setFormError('Date and Time must be provided.');
      return;
    }
    if (Number(formData.maxCapacity) <= 0) {
      setFormError('Maximum capacity must be a positive number.');
      return;
    }

    try {
      setSaving(true);
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, {
          ...formData,
          maxCapacity: Number(formData.maxCapacity),
        });
        setEditingEvent(null);
      } else {
        await onCreateEvent({
          ...formData,
          eventId: formData.eventId.toUpperCase(),
          maxCapacity: Number(formData.maxCapacity),
        });
        setShowCreateModal(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete event '${name}'? This will also cancel student registrations.`)) {
      try {
        setDeletingId(id);
        await onDeleteEvent(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredEvents = events.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Event Lifecycle Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin console: Create, configure, update, and manage participant rosters across academic events.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Events Table / Card List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Event ID</th>
                <th className="py-3.5 px-4">Event Details</th>
                <th className="py-3.5 px-4">Schedule</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">Enrollment / Capacity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEvents.map((evt) => {
                const fillPercent = Math.min(100, Math.round((evt.registeredCount / evt.maxCapacity) * 100));

                return (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-indigo-400">{evt.eventId}</td>
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-bold text-white text-sm line-clamp-1">{evt.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{evt.description}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {evt.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{evt.date}</div>
                      <div className="text-[11px] text-slate-400">{evt.time}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-300 max-w-[180px] truncate">{evt.venue}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{evt.registeredCount} / {evt.maxCapacity}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({fillPercent}%)</span>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenParticipants(evt)}
                          title="View Participant Roster"
                          className="p-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/40 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(evt)}
                          title="Edit Event"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id, evt.name)}
                          disabled={deletingId === evt.id}
                          title="Delete Event"
                          className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Event */}
      {(showCreateModal || editingEvent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-slate-100">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingEvent(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              {editingEvent ? `Edit Event: ${editingEvent.eventId}` : 'Create New College Event'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Enter all required event logistics. The backend validates schema constraints before writing to Firebase.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Event ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingEvent}
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 uppercase focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Business & Analytics">Business & Analytics</option>
                    <option value="Cloud Computing">Cloud Computing</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Career & Leadership">Career & Leadership</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Gen Cloud Architecture"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description & Syllabus *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Comprehensive event overview and target audience..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Time Range *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 - 13:00"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Campus Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Auditorium 2"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  {saving ? 'Saving to Firebase...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
