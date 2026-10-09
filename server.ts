import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  seedInitialDataIfEmpty,
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getRegistrations,
  getRegistrationById,
  registerStudentForEvent,
  cancelRegistration,
  getUserById,
  createOrUpdateUser,
  getDashboardStats,
  createGoogleCalendarEvent,
  db,
} from './server/db.ts';
import { doc, updateDoc } from 'firebase/firestore';
import { processAgentMessage } from './server/agent.ts';
import type { User } from './src/types/index.ts';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  linkClientToken,
  disconnectGoogle,
  getGoogleConnectionStatus,
  getValidGoogleToken,
  getClientId,
  getClientSecret,
  getRedirectUri,
} from './server/googleAuth.ts';
import {
  testCalendarLifecycle,
  createGoogleCalendarEventDirect,
  getGoogleCalendarEventDirect,
  updateGoogleCalendarEventDirect,
  deleteGoogleCalendarEventDirect,
} from './server/calendarApi.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper middleware to extract user from header
function getAuthUser(req: Request): User | null {
  const userHeader = req.headers['x-user-data'];
  if (userHeader && typeof userHeader === 'string') {
    try {
      return JSON.parse(userHeader) as User;
    } catch {
      return null;
    }
  }
  return null;
}

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'CampusPulse College Event Management System', timestamp: new Date().toISOString() });
});

// Auth / Login Demo & Sync
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, role } = req.body;
    let user: User | null = null;

    if (identifier) {
      user = await getUserById(identifier);
    }

    if (!user) {
      // Create quick student or admin session if not found
      if (role === 'admin' || identifier?.includes('admin')) {
        user = {
          id: 'ADMIN-001',
          studentId: 'ADMIN-001',
          name: 'Prof. Marcus Vance',
          email: 'marcus.vance@college.edu',
          course: 'Department of Computing & Academic Affairs',
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        };
      } else {
        const sid = identifier ? identifier.toUpperCase() : 'STU-2026-001';
        user = {
          id: sid,
          studentId: sid,
          name: 'Alex Rivera',
          email: 'alex.rivera@college.edu',
          course: 'B.S. Computer Science & AI',
          role: 'student',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };
      }
      await createOrUpdateUser(user);
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google OAuth User Sync into Firestore
app.post('/api/auth/google-sync', async (req: Request, res: Response) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    let existing = await getUserById(email);
    if (!existing) {
      // Check if admin email or standard student
      const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'ipshitamohanty08@gmail.com';
      const studentId = isAdmin ? `ADMIN-${uid.slice(0, 5).toUpperCase()}` : `STU-${uid.slice(0, 6).toUpperCase()}`;

      existing = {
        id: uid || email,
        studentId,
        name: displayName || email.split('@')[0],
        email,
        course: isAdmin ? 'Faculty Administration & Event Coordination' : 'Computer Science & Engineering',
        role: isAdmin ? 'admin' : 'student',
        avatarUrl: photoURL || undefined,
      };
      await createOrUpdateUser(existing);
    }

    res.json({ success: true, user: existing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- GOOGLE OAUTH 2.0 & CALENDAR API ROUTES -----------------

// 1. Get Google OAuth Consent URL
app.get('/api/auth/google/url', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const userId = user?.studentId || (req.query.userId as string) || 'STU-2026-001';

    const clientId = getClientId();
    const clientSecret = getClientSecret();
    const redirectUri = getRedirectUri(req);

    if (!clientId) {
      res.status(400).json({
        success: false,
        error: 'GOOGLE_CLIENT_ID is not configured on the server.',
        configured: false,
      });
      return;
    }

    const { url } = generateAuthUrl(userId, req);
    res.json({
      success: true,
      url,
      redirectUri,
      clientIdConfigured: true,
      clientSecretConfigured: !!clientSecret,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Google OAuth 2.0 Authorization Callback
app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const desc = error_description || error;
      res.redirect(`/?google_oauth=error&error_desc=${encodeURIComponent(String(desc))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).send('Missing authorization code from Google.');
      return;
    }

    let userId = 'STU-2026-001';
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded.userId) userId = decoded.userId;
      } catch (e) {
        console.warn('Could not parse OAuth state payload:', e);
      }
    }

    const result = await exchangeCodeForTokens(code, userId, req);
    res.redirect(`/?google_oauth=success&email=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`/?google_oauth=error&error_desc=${encodeURIComponent(err.message || 'OAuth code exchange failed')}`);
  }
});

// 3. Link Token from Client (Hybrid popup or bearer token)
app.post('/api/auth/google/link-token', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { accessToken, refreshToken, email } = req.body;
    if (!accessToken) {
      res.status(400).json({ success: false, error: 'Access token is required' });
      return;
    }

    const result = await linkClientToken(user.studentId, accessToken, refreshToken, email || user.email);
    res.json({ success: true, email: result.email });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Google Calendar Connection Status
app.get('/api/auth/google/status', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const status = await getGoogleConnectionStatus(user.studentId);
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Disconnect Google Calendar & Revoke Tokens
app.post('/api/auth/google/disconnect', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await disconnectGoogle(user.studentId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Test Complete Google Calendar Lifecycle (Create -> Retrieve -> Update -> Delete)
app.post('/api/calendar/test-flow', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const testResults = await testCalendarLifecycle(user.studentId);
    res.json(testResults);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Direct Calendar Event CRUD (Protected by user's linked Google token)
app.post('/api/calendar/events', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { summary, description, location, startTime, endTime } = req.body;
    const result = await createGoogleCalendarEventDirect(user.studentId, {
      summary,
      description,
      location,
      startTime,
      endTime,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/calendar/events/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await getGoogleCalendarEventDirect(user.studentId, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.patch('/api/calendar/events/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await updateGoogleCalendarEventDirect(user.studentId, req.params.id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/calendar/events/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await deleteGoogleCalendarEventDirect(user.studentId, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// EVENTS API
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const events = await getAllEvents();
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }
    res.json({ success: true, event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Only administrators can create events.' });
      return;
    }

    const { eventId, name, description, date, time, venue, maxCapacity, category } = req.body;
    const newEvent = await createEvent({
      eventId: (eventId || `EVT-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name,
      description,
      date,
      time,
      venue,
      maxCapacity: Number(maxCapacity),
      category: category || 'General',
      createdBy: user.studentId,
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Only administrators can update events.' });
      return;
    }

    const updated = await updateEvent(req.params.id, req.body);
    res.json({ success: true, event: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Only administrators can delete events.' });
      return;
    }

    const result = await deleteEvent(req.params.id);
    res.json({ message: 'Event deleted successfully', ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// REGISTRATIONS API
app.get('/api/registrations', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { studentId, eventId } = req.query;
    // Non-admins can only see their own registrations
    const effectiveStudentId = user.role === 'admin' ? (studentId as string) : user.studentId;

    const registrations = await getRegistrations(effectiveStudentId, eventId as string);
    res.json({ success: true, registrations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin participant list for an event
app.get('/api/events/:id/participants', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Only administrators can view participant rosters.' });
      return;
    }

    const event = await getEventById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    const registrations = await getRegistrations(undefined, event.eventId);
    const confirmed = registrations.filter((r) => r.status === 'confirmed');

    res.json({
      success: true,
      eventId: event.eventId,
      eventName: event.name,
      totalCount: confirmed.length,
      maxCapacity: event.maxCapacity,
      participants: confirmed,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register for an event (Handles validation, duplicate prevention, capacity check, and Google Calendar sync)
app.post('/api/registrations', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to register for events.' });
      return;
    }

    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, error: 'Event ID is required.' });
      return;
    }

    // Extract optional Google OAuth access token from header
    const googleToken = (req.headers['x-google-access-token'] as string) || undefined;

    const result = await registerStudentForEvent(user.studentId, eventId, googleToken);

    res.status(201).json({
      success: true,
      registration: result.registration,
      calendarStatus: result.calendarStatus,
      calendarMessage: result.calendarMessage,
      calendarLink: result.calendarLink,
    });
  } catch (err: any) {
    const isConflict = err.message?.includes('Duplicate registration');
    const isCapacity = err.message?.includes('capacity');
    const statusCode = isConflict ? 409 : isCapacity ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

// Cancel registration
app.post('/api/registrations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await cancelRegistration(req.params.id, user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Re-sync Google Calendar for a registration
app.post('/api/calendar/resync', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { registrationId } = req.body;
    let googleToken = (req.headers['x-google-access-token'] as string) || undefined;

    if (!googleToken) {
      const stored = await getValidGoogleToken(user.studentId);
      if (stored) {
        googleToken = stored.accessToken;
      }
    }

    if (!googleToken) {
      res.status(400).json({ success: false, error: 'Google Calendar is not connected. Please connect your Google account in settings.' });
      return;
    }

    const registration = await getRegistrationById(registrationId);
    if (!registration) {
      res.status(404).json({ success: false, error: 'Registration not found' });
      return;
    }

    const event = await getEventById(registration.eventId);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    const calResult = await createGoogleCalendarEvent(event, registration, googleToken);
    if (calResult.success) {
      registration.calendarStatus = 'synced';
      registration.calendarEventId = calResult.id || null;
      registration.calendarLink = calResult.htmlLink || null;
      await updateDoc(doc(db, 'registrations', registration.id), {
        calendarStatus: 'synced',
        calendarEventId: calResult.id,
        calendarLink: calResult.htmlLink,
      });
      res.json({ success: true, message: 'Google Calendar event synchronized!', calendarLink: calResult.htmlLink });
    } else {
      res.status(502).json({ success: false, error: calResult.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Dashboard statistics
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Admin access required.' });
      return;
    }

    const stats = await getDashboardStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI AGENT CHAT ENDPOINT
app.post('/api/agent/chat', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to use AI Assistant.' });
      return;
    }

    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ success: false, error: 'Message cannot be empty.' });
      return;
    }

    const googleToken = (req.headers['x-google-access-token'] as string) || undefined;

    const agentResult = await processAgentMessage(message, history || [], user, googleToken);
    res.json({ success: true, ...agentResult });
  } catch (err: any) {
    console.error('Agent chat error:', err);
    res.status(500).json({ success: false, error: err.message || 'Agent failed to respond' });
  }
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  // Pre-seed Firestore if collections are empty
  await seedInitialDataIfEmpty();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusPulse] Full-stack Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
