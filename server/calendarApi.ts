import { getValidGoogleToken } from './googleAuth.ts';
import type { CalendarTestResponse, CalendarTestStepResult } from '../src/types/index.ts';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  startTime: string; // ISO or YYYY-MM-DDTHH:mm:ss
  endTime: string;   // ISO or YYYY-MM-DDTHH:mm:ss
}

// 1. Create Calendar Event
export async function createGoogleCalendarEventDirect(
  userId: string,
  data: CalendarEventPayload
): Promise<{ success: boolean; eventId: string; htmlLink: string; raw: any }> {
  const tokenInfo = await getValidGoogleToken(userId);
  if (!tokenInfo) {
    throw new Error('Google Calendar is not connected. Please connect your Google account in settings.');
  }

  const payload = {
    summary: data.summary,
    description: data.description,
    location: data.location,
    start: {
      dateTime: new Date(data.startTime).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(data.endTime).toISOString(),
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
      Authorization: `Bearer ${tokenInfo.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error?.message || `Google API error (status ${res.status})`;
    const code = errBody.error?.code || res.status;
    throw new Error(`Google Calendar API Error [Code: ${code}]: ${message}`);
  }

  const result = await res.json();
  return {
    success: true,
    eventId: result.id,
    htmlLink: result.htmlLink,
    raw: result,
  };
}

// 2. Retrieve Calendar Event
export async function getGoogleCalendarEventDirect(
  userId: string,
  calendarEventId: string
): Promise<{ success: boolean; event: any }> {
  const tokenInfo = await getValidGoogleToken(userId);
  if (!tokenInfo) {
    throw new Error('Google Calendar is not connected.');
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`, {
    headers: {
      Authorization: `Bearer ${tokenInfo.accessToken}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error?.message || `Google API error (status ${res.status})`;
    throw new Error(`Google Calendar Retrieve Error [${res.status}]: ${message}`);
  }

  const event = await res.json();
  return { success: true, event };
}

// 3. Update Calendar Event
export async function updateGoogleCalendarEventDirect(
  userId: string,
  calendarEventId: string,
  updates: Partial<CalendarEventPayload>
): Promise<{ success: boolean; event: any }> {
  const tokenInfo = await getValidGoogleToken(userId);
  if (!tokenInfo) {
    throw new Error('Google Calendar is not connected.');
  }

  const patchBody: Record<string, any> = {};
  if (updates.summary) patchBody.summary = updates.summary;
  if (updates.description) patchBody.description = updates.description;
  if (updates.location) patchBody.location = updates.location;
  if (updates.startTime) {
    patchBody.start = { dateTime: new Date(updates.startTime).toISOString(), timeZone: 'UTC' };
  }
  if (updates.endTime) {
    patchBody.end = { dateTime: new Date(updates.endTime).toISOString(), timeZone: 'UTC' };
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenInfo.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patchBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error?.message || `Google API error (status ${res.status})`;
    throw new Error(`Google Calendar Update Error [${res.status}]: ${message}`);
  }

  const event = await res.json();
  return { success: true, event };
}

// 4. Delete Calendar Event
export async function deleteGoogleCalendarEventDirect(
  userId: string,
  calendarEventId: string
): Promise<{ success: boolean }> {
  const tokenInfo = await getValidGoogleToken(userId);
  if (!tokenInfo) {
    throw new Error('Google Calendar is not connected.');
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenInfo.accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error?.message || `Google API error (status ${res.status})`;
    throw new Error(`Google Calendar Delete Error [${res.status}]: ${message}`);
  }

  return { success: true };
}

// 5. Run Complete End-to-End Lifecycle Test
export async function testCalendarLifecycle(userId: string): Promise<CalendarTestResponse> {
  const steps: CalendarTestStepResult[] = [];

  // Step 1: Verify Token
  const tokenInfo = await getValidGoogleToken(userId);
  if (!tokenInfo) {
    steps.push({
      step: '1. Token Verification',
      success: false,
      message: 'No Google OAuth token found for user. Please connect your Google Calendar account first.',
      error: 'NOT_CONNECTED',
    });
    return {
      success: false,
      summary: 'Test aborted: Google Calendar is not connected.',
      steps,
    };
  }

  steps.push({
    step: '1. Token Verification',
    success: true,
    message: `Valid token authenticated for Google account: ${tokenInfo.email}`,
    payload: { email: tokenInfo.email, tokenPreview: `${tokenInfo.accessToken.slice(0, 10)}...` },
  });

  let createdEventId = '';

  // Step 2: Create Test Event
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

    const createRes = await createGoogleCalendarEventDirect(userId, {
      summary: 'CampusPulse Test Event — System Verification',
      description: 'Automated end-to-end integration test verifying Google Calendar API access and event lifecycle.',
      location: 'Campus Tech Hall, Room 402',
      startTime,
      endTime,
    });

    createdEventId = createRes.eventId;
    steps.push({
      step: '2. Create Calendar Event',
      success: true,
      message: `Successfully created test event in Google Calendar (ID: ${createdEventId})`,
      payload: { id: createdEventId, htmlLink: createRes.htmlLink },
    });
  } catch (err: any) {
    steps.push({
      step: '2. Create Calendar Event',
      success: false,
      message: 'Failed to create calendar event via Google API.',
      error: err.message,
    });
    return { success: false, summary: 'Calendar event creation failed.', steps };
  }

  // Step 3: Retrieve Calendar Event
  try {
    const getRes = await getGoogleCalendarEventDirect(userId, createdEventId);
    steps.push({
      step: '3. Retrieve Calendar Event',
      success: true,
      message: `Successfully retrieved event '${getRes.event.summary}' from Google Calendar.`,
      payload: { summary: getRes.event.summary, status: getRes.event.status, updated: getRes.event.updated },
    });
  } catch (err: any) {
    steps.push({
      step: '3. Retrieve Calendar Event',
      success: false,
      message: 'Failed to retrieve event from Google Calendar.',
      error: err.message,
    });
  }

  // Step 4: Update Calendar Event
  try {
    const updateRes = await updateGoogleCalendarEventDirect(userId, createdEventId, {
      description: 'UPDATED: Automated end-to-end integration test verified successfully at ' + new Date().toISOString(),
    });
    steps.push({
      step: '4. Update Calendar Event',
      success: true,
      message: 'Successfully updated calendar event description via Google API.',
      payload: { summary: updateRes.event.summary, updatedDescription: updateRes.event.description },
    });
  } catch (err: any) {
    steps.push({
      step: '4. Update Calendar Event',
      success: false,
      message: 'Failed to update calendar event.',
      error: err.message,
    });
  }

  // Step 5: Delete Calendar Event
  try {
    await deleteGoogleCalendarEventDirect(userId, createdEventId);
    steps.push({
      step: '5. Delete Calendar Event',
      success: true,
      message: `Successfully deleted test event (${createdEventId}) to clean up user's calendar.`,
    });
  } catch (err: any) {
    steps.push({
      step: '5. Delete Calendar Event',
      success: false,
      message: 'Failed to delete test calendar event.',
      error: err.message,
    });
  }

  const allSuccess = steps.every((s) => s.success);
  return {
    success: allSuccess,
    summary: allSuccess
      ? 'All 5 Google Calendar API lifecycle operations succeeded perfectly!'
      : 'Some Google Calendar operations encountered issues.',
    steps,
  };
}
