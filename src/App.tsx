import React, { useState, useEffect, useCallback } from 'react';
import { User, CollegeEvent, Registration, DashboardStats } from './types/index.ts';
import { api } from './services/api.ts';
import { initAuth, getAccessToken } from './lib/firebase.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { EventsView } from './components/EventsView.tsx';
import { EventDetailsModal } from './components/EventDetailsModal.tsx';
import { MyRegistrationsView } from './components/MyRegistrationsView.tsx';
import { EventManagementView } from './components/EventManagementView.tsx';
import { ParticipantsModal } from './components/ParticipantsModal.tsx';
import { CalendarSettingsModal } from './components/CalendarSettingsModal.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import {
  GraduationCap,
  Sparkles,
  Database,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [connectedGoogleEmail, setConnectedGoogleEmail] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CollegeEvent | null>(null);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<CollegeEvent | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState<boolean>(false);
  const [showCalendarSettingsModal, setShowCalendarSettingsModal] = useState<boolean>(false);
  const [showVivaGuide, setShowVivaGuide] = useState<boolean>(false);

  // Action states
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [cancellingRegId, setCancellingRegId] = useState<string | null>(null);
  const [resyncingRegId, setResyncingRegId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState<string | undefined>(undefined);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Check backend Google Calendar connection status
  const checkGoogleConnection = useCallback(async () => {
    try {
      const statusRes = await api.getGoogleConnectionStatus();
      setIsGoogleConnected(statusRes.connected);
      if (statusRes.connected) {
        setConnectedGoogleEmail(statusRes.email);
      } else {
        setConnectedGoogleEmail(undefined);
      }
    } catch {
      // If error or unauthenticated, ignore
    }
  }, []);

  // Restore stored session or default to null
  useEffect(() => {
    const stored = api.getCurrentUser();
    if (stored) {
      setCurrentUser(stored);
    }

    // Check Firebase Auth listener
    const unsubscribe = initAuth(
      (fbUser, token) => {
        if (token) {
          setIsGoogleConnected(true);
          setConnectedGoogleEmail(fbUser.email || undefined);
        }
      },
      () => {
        // If Firebase Auth listener clears, check backend status
        checkGoogleConnection();
      }
    );

    return () => unsubscribe();
  }, [checkGoogleConnection]);

  useEffect(() => {
    if (currentUser) {
      checkGoogleConnection();
    }
  }, [currentUser, checkGoogleConnection]);

  // Fetch application data from Node.js backend
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const evts = await api.getEvents();
      setEvents(evts);

      if (currentUser) {
        const regs = await api.getRegistrations();
        setRegistrations(regs);

        if (currentUser.role === 'admin') {
          const s = await api.getStats();
          setStats(s);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      showToast(err.message || 'Failed to refresh data from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser, refreshData]);

  // Handle Login & Logout
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    api.setCurrentUser(user);
    setActiveTab('dashboard');
    showToast(`Welcome back, ${user.name}! Authenticated as ${user.role.toUpperCase()}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    api.setCurrentUser(null);
    setRegistrations([]);
    setEvents([]);
    setActiveTab('dashboard');
    showToast('Logged out successfully.', 'info');
  };

  const handleSwitchUserRole = async (targetRole: 'student' | 'admin') => {
    try {
      const demoId = targetRole === 'admin' ? 'ADMIN-001' : 'STU-2026-001';
      const switched = await api.login(demoId, targetRole);
      setCurrentUser(switched);
      api.setCurrentUser(switched);
      setActiveTab('dashboard');
      showToast(`Switched to demo ${targetRole.toUpperCase()} mode: ${switched.name}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to switch role', 'error');
    }
  };

  // Event Registration Flow
  const handleRegister = async (event: CollegeEvent) => {
    try {
      setRegisteringEventId(event.eventId);
      const result = await api.registerForEvent(event.eventId);

      showToast(
        `Registered for '${event.name}'! Ref: ${result.registration.registrationId}. ${
          result.calendarStatus === 'synced' ? '📅 Synchronized to Google Calendar.' : ''
        }`
      );

      // Refresh data to reflect updated counts and registration record
      await refreshData();
      if (selectedEventForDetails?.eventId === event.eventId) {
        setSelectedEventForDetails(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setRegisteringEventId(null);
    }
  };

  // Cancel Registration
  const handleCancelRegistration = async (registrationId: string) => {
    try {
      setCancellingRegId(registrationId);
      const res = await api.cancelRegistration(registrationId);
      showToast(res.message);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Cancellation failed', 'error');
    } finally {
      setCancellingRegId(null);
    }
  };

  // Re-sync Google Calendar
  const handleResyncCalendar = async (registrationId: string) => {
    try {
      setResyncingRegId(registrationId);
      const res = await api.resyncCalendar(registrationId);
      showToast('Event successfully added to your Google Calendar!');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Calendar sync failed. Make sure you are signed in with Google.', 'error');
    } finally {
      setResyncingRegId(null);
    }
  };

  // Admin Event Handlers
  const handleCreateEvent = async (eventData: Partial<CollegeEvent>) => {
    await api.createEvent(eventData);
    showToast(`Created event '${eventData.name}' successfully!`);
    await refreshData();
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<CollegeEvent>) => {
    await api.updateEvent(eventId, updates);
    showToast(`Updated event successfully!`);
    await refreshData();
  };

  const handleDeleteEvent = async (eventId: string) => {
    await api.deleteEvent(eventId);
    showToast(`Deleted event successfully!`);
    await refreshData();
  };

  const handleLaunchAIPrompt = (prompt: string) => {
    setAssistantPrompt(prompt);
    setActiveTab('assistant');
  };

  // If not authenticated, show LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoogleConnected={setIsGoogleConnected}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-700'
                : 'bg-indigo-950/95 text-indigo-200 border-indigo-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUserRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAssistant={() => setActiveTab('assistant')}
        isGoogleConnected={isGoogleConnected}
        connectedGoogleEmail={connectedGoogleEmail}
        onOpenCalendarSettings={() => setShowCalendarSettingsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          currentUser.role === 'student' ? (
            <StudentDashboard
              user={currentUser}
              events={events}
              registrations={registrations}
              onNavigateTab={setActiveTab}
              onOpenEventDetails={setSelectedEventForDetails}
              onQuickRegister={handleRegister}
              onAskAI={handleLaunchAIPrompt}
              isGoogleConnected={isGoogleConnected}
              connectedGoogleEmail={connectedGoogleEmail}
              onOpenCalendarSettings={() => setShowCalendarSettingsModal(true)}
            />
          ) : (
            <AdminDashboard
              user={currentUser}
              events={events}
              registrations={registrations}
              stats={stats}
              onNavigateTab={setActiveTab}
              onCreateEventClick={() => setShowCreateEventModal(true)}
              onOpenParticipants={setSelectedEventForParticipants}
              onAskAI={handleLaunchAIPrompt}
              isGoogleConnected={isGoogleConnected}
              connectedGoogleEmail={connectedGoogleEmail}
              onOpenCalendarSettings={() => setShowCalendarSettingsModal(true)}
            />
          )
        )}

        {activeTab === 'events' && (
          <EventsView
            events={events}
            user={currentUser}
            registrations={registrations}
            onOpenEventDetails={setSelectedEventForDetails}
            onRegister={handleRegister}
            registeringEventId={registeringEventId}
          />
        )}

        {activeTab === 'my-registrations' && (
          <MyRegistrationsView
            user={currentUser}
            registrations={registrations}
            events={events}
            onCancelRegistration={handleCancelRegistration}
            onResyncCalendar={handleResyncCalendar}
            onBrowseEvents={() => setActiveTab('events')}
            cancellingId={cancellingRegId}
            resyncingId={resyncingRegId}
          />
        )}

        {activeTab === 'manage-events' && currentUser.role === 'admin' && (
          <EventManagementView
            events={events}
            user={currentUser}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onOpenParticipants={setSelectedEventForParticipants}
            showCreateModal={showCreateEventModal}
            setShowCreateModal={setShowCreateEventModal}
          />
        )}

        {activeTab === 'participants' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Participant Rosters</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  View and inspect enrolled students across all college events.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-400">{evt.eventId}</span>
                    <h3 className="font-bold text-white text-base mt-1">{evt.name}</h3>
                    <div className="text-xs text-slate-400 mt-2">
                      {evt.date} • {evt.venue}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
                      <span className="text-slate-400">Total Enrolled:</span>
                      <span className="font-bold text-white">
                        {evt.registeredCount} / {evt.maxCapacity} students
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEventForParticipants(evt)}
                    className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    View Roster ({evt.registeredCount})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <AIAssistant
            user={currentUser}
            onDataModified={refreshData}
            initialPrompt={assistantPrompt}
          />
        )}
      </main>

      {/* Footer & Viva Architecture Helper */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">CampusPulse AI</span>
            <span>• Full-Stack College Event Management System</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowVivaGuide(true)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Viva & Architecture Explanation</span>
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-500 font-mono">React + Express + Firestore + Gemini + Google Calendar</span>
          </div>
        </div>
      </footer>

      {/* Event Details Modal */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => setSelectedEventForDetails(null)}
          user={currentUser}
          registrations={registrations}
          onRegister={handleRegister}
          registeringEventId={registeringEventId}
        />
      )}

      {/* Participants Modal */}
      {selectedEventForParticipants && (
        <ParticipantsModal
          event={selectedEventForParticipants}
          onClose={() => setSelectedEventForParticipants(null)}
        />
      )}

      {/* Google Calendar Settings & Lifecycle Test Modal */}
      {showCalendarSettingsModal && (
        <CalendarSettingsModal
          user={currentUser}
          onClose={() => setShowCalendarSettingsModal(false)}
          onConnectionChange={(connected, email) => {
            setIsGoogleConnected(connected);
            setConnectedGoogleEmail(email);
          }}
        />
      )}

      {/* Viva / Architecture Guide Modal */}
      {showVivaGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-100">
            <button
              onClick={() => setShowVivaGuide(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <GraduationCap className="w-4 h-4" />
              <span>Viva Voce & Technical Architecture Reference</span>
            </div>
            <h2 className="text-2xl font-black text-white">System Architecture & Design Explanation</h2>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive reference covering all architectural questions and evaluation criteria.
            </p>

            <div className="mt-6 space-y-6 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>1. What problem does the application solve?</span>
                </h4>
                <p>
                  Colleges host dozens of workshops, seminars, and academic symposia across departments. Traditional Google Forms or spreadsheets suffer from duplicate registrations, seat over-allocation beyond venue capacity, lack of self-service cancellation, and disjointed calendar scheduling. CampusPulse solves this by providing a unified, multi-role (Student & Admin) full-stack system with strict backend validation, real-time Firestore persistence, an autonomous LLM AI Agent with tool calling, and automated Google Calendar API synchronization.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>2. Role of the Frontend & Role of the Backend</span>
                </h4>
                <p>
                  <strong>Frontend (React + Tailwind CSS + Vite):</strong> Provides a modern, responsive UI for students and administrators, handles Google OAuth login with in-memory token security, displays real-time capacity progress bars, renders the interactive AI Assistant with visual tool call logs, and communicates strictly through the backend API. The frontend never accesses or mutates Firebase directly.
                </p>
                <p className="mt-2">
                  <strong>Backend (Node.js + Express):</strong> Enforces role-based authorization, validates input schemas, performs database transactions in Firebase Firestore, executes duplicate registration checks and maximum capacity bounds, hosts the Gemini AI Agent tool executor, and dispatches authenticated HTTP requests to the Google Calendar API.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>3. Database Structure & Storage</span>
                </h4>
                <p>
                  Data is persisted in <strong>Firebase Cloud Firestore</strong> partitioned into three core collections:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 font-mono text-[11px] text-slate-300">
                  <li><strong>students:</strong> studentId, name, email, course, role ('student' | 'admin'), createdAt.</li>
                  <li><strong>events:</strong> eventId, name, description, date, time, venue, maxCapacity, registeredCount, category, createdBy.</li>
                  <li><strong>registrations:</strong> registrationId, studentId, studentName, studentEmail, eventId, eventName, registrationDate, status ('confirmed' | 'cancelled'), calendarEventId, calendarStatus ('synced' | 'failed' | 'not_synced').</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>4. Which LLM powers the AI Agent & Which Tools Can It Call?</span>
                </h4>
                <p>
                  The AI Agent is powered by <strong>Gemini 3.8 Flash</strong> via the modern <code>@google/genai</code> TypeScript SDK using native Function Calling (Tools). Tools available include:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-[11px]">
                  <li><code>getEvents</code>: Lists matching upcoming college events.</li>
                  <li><code>searchEvents</code>: Semantic and keyword search across titles and agendas.</li>
                  <li><code>getStudentRegistrations</code>: Queries active and past student registrations.</li>
                  <li><code>checkRegistration</code>: Checks if student is registered for a specific event.</li>
                  <li><code>getRegistrationCount</code>: Returns seat capacity and enrolled count.</li>
                  <li><code>registerStudentForEvent</code>: Performs the complete 10-step registration flow (validating student, event, duplicate check, capacity check, Firestore write, and Google Calendar sync).</li>
                  <li><code>cancelRegistration</code>: Cancels student's active registration.</li>
                  <li><code>getEventParticipants</code>, <code>createEvent</code>, <code>updateEvent</code>, <code>deleteEvent</code>: Admin-only management tools.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>5. How Are Duplicate Registrations & Over-Capacity Prevented?</span>
                </h4>
                <p>
                  Duplicate prevention occurs in the backend business logic. Before writing to the <code>registrations</code> collection, the server executes a compound query matching <code>studentId == sid && eventId == eid && status == 'confirmed'</code>. If a record is found, the server immediately halts and returns an HTTP 409 Conflict error. Similarly, the server queries the confirmed count and compares it against <code>event.maxCapacity</code>; if full, it halts with an HTTP 400 Bad Request error.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>6. Google Calendar API Integration & Failure Isolation</span>
                </h4>
                <p>
                  The user authorizes the Google Calendar events scope (<code>https://www.googleapis.com/auth/calendar.events</code>) via client-side Firebase Auth popup. The access token is held in-memory and passed to backend routes via Bearer headers. The backend formats an RFC 5545 calendar payload with start/end datetimes, venue, and summary, and calls Google's REST API. If Google Calendar fails (e.g. revoked token, network timeout), the registration record in Firebase remains completely valid and stable, while <code>calendarStatus</code> is marked as 'failed', and a clear user-friendly message is presented with an option to re-sync anytime.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowVivaGuide(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
