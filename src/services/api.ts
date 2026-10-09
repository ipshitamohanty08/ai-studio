import {
  User,
  CollegeEvent,
  Registration,
  DashboardStats,
  ChatMessage,
  ParticipantInfo,
  GoogleCalendarConnectionStatus,
  CalendarTestResponse,
} from '../types/index.ts';
import { getAccessToken } from '../lib/firebase.ts';

class ApiService {
  private currentUser: User | null = null;

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('campuspulse_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('campuspulse_active_user');
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('campuspulse_active_user');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          this.currentUser = null;
        }
      }
    }
    return this.currentUser;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const user = this.getCurrentUser();
    if (user) {
      headers['x-user-data'] = JSON.stringify(user);
    }

    const token = getAccessToken();
    if (token) {
      headers['x-google-access-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async login(identifier?: string, role?: 'student' | 'admin'): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, role }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    this.setCurrentUser(data.user);
    return data.user;
  }

  async syncGoogleUser(googleUser: { email: string; displayName?: string; photoURL?: string; uid: string }): Promise<User> {
    const res = await fetch('/api/auth/google-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googleUser),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Google user sync failed');
    }
    this.setCurrentUser(data.user);
    return data.user;
  }

  async getEvents(): Promise<CollegeEvent[]> {
    const res = await fetch('/api/events', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch events');
    return data.events || [];
  }

  async getEventById(id: string): Promise<CollegeEvent> {
    const res = await fetch(`/api/events/${id}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch event');
    return data.event;
  }

  async createEvent(eventData: Partial<CollegeEvent>): Promise<CollegeEvent> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(eventData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create event');
    return data.event;
  }

  async updateEvent(id: string, updates: Partial<CollegeEvent>): Promise<CollegeEvent> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update event');
    return data.event;
  }

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete event');
  }

  async getRegistrations(studentId?: string, eventId?: string): Promise<Registration[]> {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (eventId) params.append('eventId', eventId);

    const res = await fetch(`/api/registrations?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch registrations');
    return data.registrations || [];
  }

  async getEventParticipants(eventId: string): Promise<{
    eventId: string;
    eventName: string;
    totalCount: number;
    maxCapacity: number;
    participants: ParticipantInfo[];
  }> {
    const res = await fetch(`/api/events/${eventId}/participants`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch event participants');
    return data;
  }

  async registerForEvent(eventId: string): Promise<{
    registration: Registration;
    calendarStatus: string;
    calendarMessage: string;
    calendarLink?: string | null;
  }> {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ eventId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register for event');
    }
    return data;
  }

  async cancelRegistration(registrationId: string): Promise<{ message: string; registration: Registration }> {
    const res = await fetch(`/api/registrations/${registrationId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel registration');
    return data;
  }

  async resyncCalendar(registrationId: string): Promise<{ calendarLink?: string }> {
    const res = await fetch('/api/calendar/resync', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ registrationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync calendar');
    return data;
  }

  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard stats');
    return data.stats;
  }

  async sendAgentMessage(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: any[] }> = []
  ): Promise<{
    reply: string;
    toolCalls: any[];
  }> {
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Agent failed to respond');
    return data;
  }

  // Google OAuth 2.0 & Calendar API methods
  async getGoogleAuthUrl(): Promise<{
    url: string;
    redirectUri: string;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
  }> {
    const res = await fetch('/api/auth/google/url', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate Google OAuth URL');
    return data;
  }

  async getGoogleConnectionStatus(): Promise<GoogleCalendarConnectionStatus> {
    const res = await fetch('/api/auth/google/status', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check Google connection status');
    return data;
  }

  async linkGoogleClientToken(accessToken: string, refreshToken?: string, email?: string): Promise<{ email: string }> {
    const res = await fetch('/api/auth/google/link-token', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ accessToken, refreshToken, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to link Google token');
    return data;
  }

  async disconnectGoogle(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/google/disconnect', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to disconnect Google account');
    return data;
  }

  async testCalendarFlow(): Promise<CalendarTestResponse> {
    const res = await fetch('/api/calendar/test-flow', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Calendar test flow failed');
    return data;
  }

  async createCalendarEvent(data: {
    summary: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
  }): Promise<any> {
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create calendar event');
    return result;
  }

  async getCalendarEvent(id: string): Promise<any> {
    const res = await fetch(`/api/calendar/events/${id}`, {
      headers: this.getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to get calendar event');
    return result;
  }

  async updateCalendarEvent(id: string, updates: any): Promise<any> {
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update calendar event');
    return result;
  }

  async deleteCalendarEvent(id: string): Promise<any> {
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete calendar event');
    return result;
  }
}

export const api = new ApiService();
