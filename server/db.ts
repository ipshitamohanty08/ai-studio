import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { CollegeEvent, Registration, User, DashboardStats } from '../src/types/index.ts';
import { getValidGoogleToken } from './googleAuth.ts';
import { deleteGoogleCalendarEventDirect } from './calendarApi.ts';

// Read firebase-applet-config.json
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading firebase-applet-config.json:', err);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection References
const STUDENTS_COL = 'students';
const EVENTS_COL = 'events';
const REGISTRATIONS_COL = 'registrations';

// Pre-seed sample events and accounts
export async function seedInitialDataIfEmpty() {
  try {
    const eventsSnapshot = await getDocs(collection(db, EVENTS_COL));
    if (eventsSnapshot.empty) {
      console.log('Seeding initial events into Firestore...');
      const initialEvents: CollegeEvent[] = [
        {
          id: 'EVT-101',
          eventId: 'EVT-101',
          name: 'Hands-on Generative AI & LLM Workshop',
          description: 'A deep-dive workshop on building full-stack AI agents, prompt engineering, and LLM tool-calling architectures.',
          date: '2026-10-15',
          time: '10:00 - 13:00',
          venue: 'Tech Hub Lab 4, Science & Computing Block',
          maxCapacity: 30,
          registeredCount: 0,
          category: 'Artificial Intelligence',
          createdBy: 'ADMIN-001',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'EVT-102',
          eventId: 'EVT-102',
          name: 'Predictive Business Analytics Seminar',
          description: 'Explore predictive decision modeling, business intelligence pipelines, and data-driven corporate strategies.',
          date: '2026-10-18',
          time: '14:00 - 16:30',
          venue: 'Management Auditorium Hall, Business Wing',
          maxCapacity: 45,
          registeredCount: 0,
          category: 'Business & Analytics',
          createdBy: 'ADMIN-001',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'EVT-103',
          eventId: 'EVT-103',
          name: 'Cloud-Native Microservices with Kubernetes',
          description: 'Master container orchestration, automated CI/CD pipelines, and zero-downtime deployment topologies.',
          date: '2026-10-22',
          time: '11:00 - 13:30',
          venue: 'Engineering Seminar Hall 2',
          maxCapacity: 40,
          registeredCount: 0,
          category: 'Cloud Computing',
          createdBy: 'ADMIN-001',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'EVT-104',
          eventId: 'EVT-104',
          name: 'Cybersecurity Threat Defense Bootcamp',
          description: 'Hands-on penetration testing, ethical hacking, secure coding principles, and zero-trust perimeter defense.',
          date: '2026-10-25',
          time: '09:30 - 12:30',
          venue: 'Cyber Defense Lab 101, West Wing',
          maxCapacity: 25,
          registeredCount: 0,
          category: 'Cybersecurity',
          createdBy: 'ADMIN-001',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'EVT-105',
          eventId: 'EVT-105',
          name: 'Tech Leadership & Startup Pitching Masterclass',
          description: 'Learn executive leadership, fundraising pitch dynamics, and how to scale collegiate technology ventures.',
          date: '2026-10-29',
          time: '15:00 - 17:30',
          venue: 'College Innovation Center Amphitheater',
          maxCapacity: 50,
          registeredCount: 0,
          category: 'Career & Leadership',
          createdBy: 'ADMIN-001',
          createdAt: new Date().toISOString(),
        },
      ];

      for (const evt of initialEvents) {
        await setDoc(doc(db, EVENTS_COL, evt.id), evt);
      }
      console.log('Events seeded successfully.');
    }

    const studentsSnapshot = await getDocs(collection(db, STUDENTS_COL));
    if (studentsSnapshot.empty) {
      console.log('Seeding initial students and faculty into Firestore...');
      const initialUsers: User[] = [
        {
          id: 'STU-2026-001',
          studentId: 'STU-2026-001',
          name: 'Alex Rivera',
          email: 'alex.rivera@college.edu',
          course: 'B.S. Computer Science & AI',
          role: 'student',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        {
          id: 'ADMIN-001',
          studentId: 'ADMIN-001',
          name: 'Prof. Marcus Vance',
          email: 'marcus.vance@college.edu',
          course: 'Department of Computing & Academic Affairs',
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
        {
          id: 'STU-2026-002',
          studentId: 'STU-2026-002',
          name: 'Ipshita Mohanty',
          email: 'ipshitamohanty08@gmail.com',
          course: 'M.S. Data Science & Machine Learning',
          role: 'student',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        },
      ];

      for (const u of initialUsers) {
        await setDoc(doc(db, STUDENTS_COL, u.id), u);
      }
      console.log('Users seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
}

// EVENTS CRUD
export async function getAllEvents(): Promise<CollegeEvent[]> {
  const snapshot = await getDocs(collection(db, EVENTS_COL));
  const events: CollegeEvent[] = [];
  snapshot.forEach((d) => {
    events.push(d.data() as CollegeEvent);
  });
  // Sort by date ascending
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getEventById(eventId: string): Promise<CollegeEvent | null> {
  const snap = await getDoc(doc(db, EVENTS_COL, eventId));
  if (!snap.exists()) {
    // Try searching by eventId field
    const q = query(collection(db, EVENTS_COL), where('eventId', '==', eventId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CollegeEvent;
    }
    return null;
  }
  return snap.data() as CollegeEvent;
}

export async function createEvent(eventData: Omit<CollegeEvent, 'id' | 'createdAt' | 'registeredCount'>): Promise<CollegeEvent> {
  // Validate required fields
  if (!eventData.eventId || !eventData.name || !eventData.date || !eventData.time || !eventData.venue || !eventData.maxCapacity) {
    throw new Error('All required fields (Event ID, Name, Date, Time, Venue, Max Capacity) must be provided.');
  }

  // Check if Event ID already exists
  const existing = await getEventById(eventData.eventId);
  if (existing) {
    throw new Error(`Event with ID '${eventData.eventId}' already exists.`);
  }

  const newEvent: CollegeEvent = {
    ...eventData,
    id: eventData.eventId,
    registeredCount: 0,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, EVENTS_COL, newEvent.id), newEvent);
  return newEvent;
}

export async function updateEvent(eventId: string, updates: Partial<CollegeEvent>): Promise<CollegeEvent> {
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error(`Event with ID '${eventId}' not found.`);
  }

  const updated: CollegeEvent = {
    ...event,
    ...updates,
    id: event.id, // prevent changing doc id
    eventId: event.eventId,
  };

  await setDoc(doc(db, EVENTS_COL, event.id), updated);
  return updated;
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; eventId: string }> {
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error(`Event with ID '${eventId}' not found.`);
  }

  // Also cancel or clean up active registrations for this event
  const regQ = query(collection(db, REGISTRATIONS_COL), where('eventId', '==', event.eventId));
  const regSnap = await getDocs(regQ);
  for (const regDoc of regSnap.docs) {
    await updateDoc(doc(db, REGISTRATIONS_COL, regDoc.id), { status: 'cancelled' });
  }

  await deleteDoc(doc(db, EVENTS_COL, event.id));
  return { success: true, eventId };
}

// REGISTRATIONS
export async function getRegistrations(studentId?: string, eventId?: string): Promise<Registration[]> {
  let q = collection(db, REGISTRATIONS_COL);
  let constraints: any[] = [];
  if (studentId) constraints.push(where('studentId', '==', studentId));
  if (eventId) constraints.push(where('eventId', '==', eventId));

  const queryRef = constraints.length > 0 ? query(q, ...constraints) : q;
  const snapshot = await getDocs(queryRef);
  const regs: Registration[] = [];
  snapshot.forEach((d) => {
    regs.push(d.data() as Registration);
  });
  return regs.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
}

export async function getRegistrationById(registrationId: string): Promise<Registration | null> {
  const snap = await getDoc(doc(db, REGISTRATIONS_COL, registrationId));
  if (!snap.exists()) return null;
  return snap.data() as Registration;
}

// Student & User Management
export async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, STUDENTS_COL, userId));
  if (snap.exists()) {
    return snap.data() as User;
  }
  // Try querying by email
  const q = query(collection(db, STUDENTS_COL), where('email', '==', userId));
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    return qSnap.docs[0].data() as User;
  }
  return null;
}

export async function createOrUpdateUser(user: User): Promise<User> {
  await setDoc(doc(db, STUDENTS_COL, user.id), user);
  return user;
}

// CORE REGISTRATION BUSINESS LOGIC: Capacity + Duplicate Check + Persistence
export async function registerStudentForEvent(
  studentId: string,
  eventId: string,
  googleAccessToken?: string
): Promise<{
  registration: Registration;
  calendarStatus: 'synced' | 'failed' | 'not_synced';
  calendarMessage: string;
  calendarLink?: string | null;
}> {
  // 1. Validate Student
  const student = await getUserById(studentId);
  if (!student) {
    throw new Error(`Student with ID '${studentId}' does not exist.`);
  }

  // 2. Validate Event
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error(`Event with ID '${eventId}' does not exist.`);
  }

  // 3. Duplicate Registration Check (Active/Confirmed)
  const dupQuery = query(
    collection(db, REGISTRATIONS_COL),
    where('studentId', '==', student.studentId),
    where('eventId', '==', event.eventId),
    where('status', '==', 'confirmed')
  );
  const dupSnap = await getDocs(dupQuery);
  if (!dupSnap.empty) {
    throw new Error(`Duplicate registration prevented: Student '${student.name}' is already actively registered for '${event.name}'.`);
  }

  // 4. Capacity Validation
  const confirmedRegsQuery = query(
    collection(db, REGISTRATIONS_COL),
    where('eventId', '==', event.eventId),
    where('status', '==', 'confirmed')
  );
  const confirmedSnap = await getDocs(confirmedRegsQuery);
  const currentCount = confirmedSnap.size;

  if (currentCount >= event.maxCapacity) {
    throw new Error(`Registration closed: Event '${event.name}' has reached its maximum capacity of ${event.maxCapacity} participants.`);
  }

  // 5. Generate Registration ID
  const cleanStudentId = student.studentId.replace(/[^a-zA-Z0-9]/g, '');
  const cleanEventId = event.eventId.replace(/[^a-zA-Z0-9]/g, '');
  const registrationId = `REG-${cleanEventId}-${cleanStudentId}-${Date.now().toString().slice(-4)}`;

  const registration: Registration = {
    id: registrationId,
    registrationId,
    studentId: student.studentId,
    studentName: student.name,
    studentEmail: student.email,
    eventId: event.eventId,
    eventName: event.name,
    eventDate: event.date,
    eventTime: event.time,
    eventVenue: event.venue,
    registrationDate: new Date().toISOString(),
    status: 'confirmed',
    calendarStatus: 'not_synced',
    calendarEventId: null,
    calendarLink: null,
  };

  // 6. Google Calendar Integration Attempt (Server-side)
  // Check either provided access token or stored server-side token with automatic refresh
  let tokenToUse = googleAccessToken;
  if (!tokenToUse) {
    const stored = await getValidGoogleToken(student.studentId);
    if (stored) {
      tokenToUse = stored.accessToken;
    }
  }

  let calendarStatus: 'synced' | 'failed' | 'not_synced' = 'not_synced';
  let calendarMessage = 'Google Calendar is not connected. Connect in Settings to auto-sync events.';
  let calendarLink: string | null = null;
  let calendarEventId: string | null = null;

  if (tokenToUse) {
    try {
      const calendarResult = await createGoogleCalendarEvent(event, registration, tokenToUse);
      if (calendarResult.success) {
        calendarStatus = 'synced';
        calendarMessage = 'Event successfully synchronized with your Google Calendar.';
        calendarLink = calendarResult.htmlLink || null;
        calendarEventId = calendarResult.id || null;
      } else {
        calendarStatus = 'failed';
        calendarMessage = `Google Calendar synchronization failed: ${calendarResult.error}`;
      }
    } catch (gErr: any) {
      calendarStatus = 'failed';
      calendarMessage = `Google Calendar error: ${gErr.message || 'Unable to communicate with Calendar API'}`;
      console.error('Google Calendar error during registration:', gErr);
    }
  }

  registration.calendarStatus = calendarStatus;
  registration.calendarEventId = calendarEventId;
  registration.calendarLink = calendarLink;

  // 7. Store Registration in Firebase
  await setDoc(doc(db, REGISTRATIONS_COL, registration.id), registration);

  // 8. Update Event Registered Count
  const newCount = currentCount + 1;
  await updateDoc(doc(db, EVENTS_COL, event.id), { registeredCount: newCount });

  return {
    registration,
    calendarStatus,
    calendarMessage,
    calendarLink,
  };
}

// Cancel Registration
export async function cancelRegistration(
  registrationId: string,
  user: User
): Promise<{ success: boolean; message: string; registration: Registration }> {
  const reg = await getRegistrationById(registrationId);
  if (!reg) {
    // Try searching by registrationId field
    const q = query(collection(db, REGISTRATIONS_COL), where('registrationId', '==', registrationId));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`Registration record '${registrationId}' not found.`);
    }
    const foundReg = snap.docs[0].data() as Registration;
    return cancelRegistration(foundReg.id, user);
  }

  // Authorization check: only owner or admin can cancel
  if (user.role !== 'admin' && reg.studentId !== user.studentId) {
    throw new Error('Unauthorized: You can only cancel your own registrations.');
  }

  if (reg.status === 'cancelled') {
    return { success: true, message: 'Registration is already cancelled.', registration: reg };
  }

  // Update status to cancelled
  reg.status = 'cancelled';
  await setDoc(doc(db, REGISTRATIONS_COL, reg.id), reg);

  // If synchronized with Google Calendar, delete event from user's calendar
  if (reg.calendarEventId) {
    try {
      await deleteGoogleCalendarEventDirect(reg.studentId, reg.calendarEventId);
      console.log(`Deleted Google Calendar event ${reg.calendarEventId} upon registration cancellation.`);
    } catch (calErr) {
      console.warn('Could not remove calendar event during registration cancellation:', calErr);
    }
  }

  // Decrement event registered count
  const event = await getEventById(reg.eventId);
  if (event && event.registeredCount > 0) {
    await updateDoc(doc(db, EVENTS_COL, event.id), { registeredCount: Math.max(0, event.registeredCount - 1) });
  }

  return {
    success: true,
    message: `Registration for '${reg.eventName}' has been successfully cancelled.`,
    registration: reg,
  };
}

// GOOGLE CALENDAR API SERVER HELPER
export async function createGoogleCalendarEvent(
  event: CollegeEvent,
  registration: Registration,
  accessToken: string
): Promise<{ success: boolean; id?: string; htmlLink?: string; error?: string }> {
  try {
    // Parse start and end time
    // event.date is e.g. "2026-10-15"
    // event.time is e.g. "10:00 - 13:00"
    let startTimeStr = '09:00:00';
    let endTimeStr = '11:00:00';

    if (event.time && event.time.includes('-')) {
      const parts = event.time.split('-').map((s) => s.trim());
      if (parts[0]) startTimeStr = parts[0].length === 5 ? `${parts[0]}:00` : parts[0];
      if (parts[1]) endTimeStr = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
    }

    const startDateTime = `${event.date}T${startTimeStr}`;
    const endDateTime = `${event.date}T${endTimeStr}`;

    let startDateObj = new Date(startDateTime);
    if (isNaN(startDateObj.getTime())) {
      startDateObj = new Date();
    }
    let endDateObj = new Date(endDateTime);
    if (isNaN(endDateObj.getTime())) {
      endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
    }

    const calendarEventPayload = {
      summary: `[College Event] ${event.name}`,
      description: `${event.description}\n\nVenue: ${event.venue}\nRegistration ID: ${registration.registrationId}\nStudent: ${registration.studentName} (${registration.studentId})\n\nManage your registration on CampusPulse AI Event Portal.`,
      location: event.venue,
      start: {
        dateTime: startDateObj.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateObj.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEventPayload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody.error?.message || `Google API status ${res.status}`;
      return { success: false, error: errMsg };
    }

    const createdEvent = await res.json();
    return {
      success: true,
      id: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching Google Calendar API' };
  }
}

// DASHBOARD STATS
export async function getDashboardStats(): Promise<DashboardStats> {
  const events = await getAllEvents();
  const confirmedRegsQuery = query(collection(db, REGISTRATIONS_COL), where('status', '==', 'confirmed'));
  const regSnap = await getDocs(confirmedRegsQuery);

  const totalEvents = events.length;
  const activeRegistrations = regSnap.size;
  const totalCapacity = events.reduce((sum, e) => sum + (e.maxCapacity || 0), 0);
  const capacityUtilization = totalCapacity > 0 ? Math.round((activeRegistrations / totalCapacity) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter((e) => e.date >= today).length;

  const eventsByCategory: Record<string, number> = {};
  events.forEach((e) => {
    const cat = e.category || 'General';
    eventsByCategory[cat] = (eventsByCategory[cat] || 0) + 1;
  });

  return {
    totalEvents,
    activeRegistrations,
    totalCapacity,
    capacityUtilization,
    upcomingEvents,
    eventsByCategory,
  };
}
