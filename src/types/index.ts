export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  studentId: string;
  name: string;
  email: string;
  course: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface CollegeEvent {
  id: string;
  eventId: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  maxCapacity: number;
  registeredCount: number;
  category: string;
  createdBy: string;
  createdAt: string;
}

export type RegistrationStatus = 'confirmed' | 'cancelled';
export type CalendarSyncStatus = 'synced' | 'failed' | 'not_synced' | 'skipped';

export interface Registration {
  id: string;
  registrationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  registrationDate: string;
  status: RegistrationStatus;
  calendarEventId?: string | null;
  calendarStatus?: CalendarSyncStatus;
  calendarLink?: string | null;
}

export interface ParticipantInfo {
  registrationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  course?: string;
  registrationDate: string;
  status: RegistrationStatus;
  calendarStatus?: CalendarSyncStatus;
}

export interface DashboardStats {
  totalEvents: number;
  activeRegistrations: number;
  totalCapacity: number;
  capacityUtilization: number;
  upcomingEvents: number;
  eventsByCategory: Record<string, number>;
}

export interface ToolExecutionRecord {
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'executing' | 'success' | 'error';
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  toolCalls?: ToolExecutionRecord[];
}

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  email?: string;
  hasRefreshToken?: boolean;
  expiryDate?: number;
  updatedAt?: string;
  error?: string;
}

export interface CalendarTestStepResult {
  step: string;
  success: boolean;
  message: string;
  payload?: any;
  error?: string;
}

export interface CalendarTestResponse {
  success: boolean;
  summary: string;
  steps: CalendarTestStepResult[];
}
