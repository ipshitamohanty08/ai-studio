import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import type { User, ToolExecutionRecord } from '../src/types/index.ts';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getRegistrations,
  registerStudentForEvent,
  cancelRegistration,
} from './db.ts';

const ai = new GoogleGenAI({});

// Tool Declarations
const getEventsTool: FunctionDeclaration = {
  name: 'getEvents',
  description: 'Retrieve college workshops, seminars, and academic events. Can filter by category or date.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: 'Optional category filter, e.g. "Artificial Intelligence", "Business & Analytics", "Cloud Computing", "Cybersecurity", "Career & Leadership"',
      },
      upcomingOnly: {
        type: Type.BOOLEAN,
        description: 'Whether to show only upcoming events from today onwards. Defaults to true.',
      },
    },
  },
};

const searchEventsTool: FunctionDeclaration = {
  name: 'searchEvents',
  description: 'Search events by keyword or topic query (e.g., "AI", "Machine Learning", "Data", "Security", "Leadership").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query or keyword to look for in event name, description, venue, or category.',
      },
    },
    required: ['query'],
  },
};

const getEventDetailsTool: FunctionDeclaration = {
  name: 'getEventDetails',
  description: 'Get full details for a specific college event by its event ID or name.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The unique event ID (e.g. EVT-101) or exact event title.',
      },
    },
    required: ['eventId'],
  },
};

const getStudentRegistrationsTool: FunctionDeclaration = {
  name: 'getStudentRegistrations',
  description: 'View current active and past registrations for the authenticated student.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      statusFilter: {
        type: Type.STRING,
        description: 'Optional status filter: "confirmed" or "cancelled" or "all".',
      },
    },
  },
};

const checkRegistrationTool: FunctionDeclaration = {
  name: 'checkRegistration',
  description: 'Check whether the student is currently registered for a specific event.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The ID or name of the event to check registration for.',
      },
    },
    required: ['eventId'],
  },
};

const getRegistrationCountTool: FunctionDeclaration = {
  name: 'getRegistrationCount',
  description: 'Check the current registration count, seats taken, and remaining capacity for an event.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The event ID or name to inspect seat capacity for.',
      },
    },
    required: ['eventId'],
  },
};

const registerStudentForEventTool: FunctionDeclaration = {
  name: 'registerStudentForEvent',
  description: 'Register the authenticated student for a specific college event, checking duplicate registration, capacity, and syncing to Google Calendar.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The event ID (e.g. EVT-101) or event name to register for.',
      },
    },
    required: ['eventId'],
  },
};

const cancelRegistrationTool: FunctionDeclaration = {
  name: 'cancelRegistration',
  description: 'Cancel an existing registration for an event for the authenticated student.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The event ID or registration ID to cancel.',
      },
    },
    required: ['eventId'],
  },
};

// Admin-Only Tools
const getEventParticipantsTool: FunctionDeclaration = {
  name: 'getEventParticipants',
  description: '[ADMIN ONLY] Get the list of all students registered for a specific event, including their names, emails, and registration timestamps.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The event ID to inspect participants for.',
      },
    },
    required: ['eventId'],
  },
};

const createEventTool: FunctionDeclaration = {
  name: 'createEvent',
  description: '[ADMIN ONLY] Create a new college workshop or academic event with required fields.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'Unique Event ID (e.g., EVT-106).',
      },
      name: {
        type: Type.STRING,
        description: 'Title of the event or workshop.',
      },
      description: {
        type: Type.STRING,
        description: 'Detailed description of the event agenda and syllabus.',
      },
      date: {
        type: Type.STRING,
        description: 'Date in YYYY-MM-DD format (e.g., 2026-10-30).',
      },
      time: {
        type: Type.STRING,
        description: 'Time range (e.g., "14:00 - 16:30").',
      },
      venue: {
        type: Type.STRING,
        description: 'Campus hall, auditorium, or lab location.',
      },
      maxCapacity: {
        type: Type.NUMBER,
        description: 'Maximum participant capacity number.',
      },
      category: {
        type: Type.STRING,
        description: 'Event category, e.g. "Artificial Intelligence", "Business & Analytics", "Cloud Computing", "Cybersecurity", "Career & Leadership".',
      },
    },
    required: ['eventId', 'name', 'description', 'date', 'time', 'venue', 'maxCapacity'],
  },
};

const updateEventTool: FunctionDeclaration = {
  name: 'updateEvent',
  description: '[ADMIN ONLY] Update an existing college event details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The ID of the event to update.',
      },
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      date: { type: Type.STRING },
      time: { type: Type.STRING },
      venue: { type: Type.STRING },
      maxCapacity: { type: Type.NUMBER },
      category: { type: Type.STRING },
    },
    required: ['eventId'],
  },
};

const deleteEventTool: FunctionDeclaration = {
  name: 'deleteEvent',
  description: '[ADMIN ONLY] Delete an event by event ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The ID of the event to delete.',
      },
    },
    required: ['eventId'],
  },
};

// Helper: resolve event identifier (handles either EVT-xxx or partial title match)
async function resolveEvent(identifier: string) {
  if (!identifier) return null;
  const events = await getAllEvents();
  // Exact match by ID
  let match = events.find((e) => e.eventId.toLowerCase() === identifier.toLowerCase() || e.id.toLowerCase() === identifier.toLowerCase());
  if (match) return match;

  // Search by exact name
  match = events.find((e) => e.name.toLowerCase() === identifier.toLowerCase());
  if (match) return match;

  // Partial name match
  const query = identifier.toLowerCase();
  match = events.find((e) => e.name.toLowerCase().includes(query) || query.includes(e.name.toLowerCase()));
  if (match) return match;

  // Keyword match (e.g. "AI" -> "Hands-on Generative AI & LLM Workshop", "business analytics" -> EVT-102)
  if (query.includes('ai') || query.includes('llm')) {
    match = events.find((e) => e.name.toLowerCase().includes('ai') || e.category.toLowerCase().includes('intelligence'));
    if (match) return match;
  }
  if (query.includes('business') || query.includes('analytics')) {
    match = events.find((e) => e.name.toLowerCase().includes('business') || e.name.toLowerCase().includes('analytics'));
    if (match) return match;
  }
  if (query.includes('cloud') || query.includes('kubernetes')) {
    match = events.find((e) => e.name.toLowerCase().includes('cloud') || e.name.toLowerCase().includes('kubernetes'));
    if (match) return match;
  }
  if (query.includes('cyber') || query.includes('security')) {
    match = events.find((e) => e.name.toLowerCase().includes('cyber') || e.name.toLowerCase().includes('security'));
    if (match) return match;
  }

  return null;
}

// Tool Execution Dispatcher
export async function executeAgentTool(
  toolName: string,
  args: any,
  user: User,
  googleAccessToken?: string
): Promise<{ success: boolean; data: any; message: string }> {
  try {
    switch (toolName) {
      case 'getEvents': {
        const events = await getAllEvents();
        let filtered = events;
        if (args?.category) {
          filtered = filtered.filter((e) => e.category?.toLowerCase() === args.category.toLowerCase());
        }
        if (args?.upcomingOnly !== false) {
          const today = new Date().toISOString().split('T')[0];
          filtered = filtered.filter((e) => e.date >= today);
        }
        return {
          success: true,
          data: filtered.map((e) => ({
            eventId: e.eventId,
            name: e.name,
            date: e.date,
            time: e.time,
            venue: e.venue,
            maxCapacity: e.maxCapacity,
            registeredCount: e.registeredCount,
            seatsAvailable: Math.max(0, e.maxCapacity - e.registeredCount),
            category: e.category,
          })),
          message: `Found ${filtered.length} matching events.`,
        };
      }

      case 'searchEvents': {
        const events = await getAllEvents();
        const q = (args.query || '').toLowerCase();
        const matches = events.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.venue.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q) ||
            e.eventId.toLowerCase().includes(q)
        );
        return {
          success: true,
          data: matches.map((e) => ({
            eventId: e.eventId,
            name: e.name,
            date: e.date,
            time: e.time,
            venue: e.venue,
            maxCapacity: e.maxCapacity,
            registeredCount: e.registeredCount,
            seatsAvailable: Math.max(0, e.maxCapacity - e.registeredCount),
            category: e.category,
            description: e.description,
          })),
          message: `Found ${matches.length} events for query '${args.query}'.`,
        };
      }

      case 'getEventDetails': {
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' not found.` };
        }
        return {
          success: true,
          data: {
            ...event,
            seatsAvailable: Math.max(0, event.maxCapacity - event.registeredCount),
          },
          message: `Retrieved details for ${event.name}.`,
        };
      }

      case 'getStudentRegistrations': {
        const regs = await getRegistrations(user.studentId);
        let filtered = regs;
        if (args?.statusFilter && args.statusFilter !== 'all') {
          filtered = regs.filter((r) => r.status === args.statusFilter);
        }
        return {
          success: true,
          data: filtered,
          message: `Found ${filtered.length} registration records for ${user.name}.`,
        };
      }

      case 'checkRegistration': {
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' does not exist.` };
        }
        const regs = await getRegistrations(user.studentId, event.eventId);
        const active = regs.find((r) => r.status === 'confirmed');
        if (active) {
          return {
            success: true,
            data: {
              isRegistered: true,
              registrationId: active.registrationId,
              event: event.name,
              date: event.date,
              time: event.time,
              venue: event.venue,
              calendarStatus: active.calendarStatus,
            },
            message: `Yes, you are actively registered for '${event.name}' (Registration ID: ${active.registrationId}).`,
          };
        } else {
          return {
            success: true,
            data: { isRegistered: false, event: event.name },
            message: `No, you are not registered for '${event.name}'. Seats are available if you wish to register!`,
          };
        }
      }

      case 'getRegistrationCount': {
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' not found.` };
        }
        const confirmedRegs = await getRegistrations(undefined, event.eventId);
        const activeCount = confirmedRegs.filter((r) => r.status === 'confirmed').length;
        const available = Math.max(0, event.maxCapacity - activeCount);
        return {
          success: true,
          data: {
            eventId: event.eventId,
            eventName: event.name,
            maxCapacity: event.maxCapacity,
            registeredCount: activeCount,
            seatsAvailable: available,
            isFull: available <= 0,
          },
          message: `'${event.name}' currently has ${activeCount} registered participants out of ${event.maxCapacity} total seats (${available} seats remaining).`,
        };
      }

      case 'registerStudentForEvent': {
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Cannot register: Event '${args.eventId}' does not exist.` };
        }

        // Run full registration business logic with duplicate and capacity check
        const result = await registerStudentForEvent(user.studentId, event.eventId, googleAccessToken);
        return {
          success: true,
          data: {
            registrationId: result.registration.registrationId,
            eventId: event.eventId,
            eventName: event.name,
            date: event.date,
            time: event.time,
            venue: event.venue,
            calendarStatus: result.calendarStatus,
            calendarMessage: result.calendarMessage,
            calendarLink: result.calendarLink,
          },
          message: `Successfully registered for '${event.name}'! Registration ID is ${result.registration.registrationId}. ${result.calendarMessage}`,
        };
      }

      case 'cancelRegistration': {
        const event = await resolveEvent(args.eventId);
        const regs = await getRegistrations(user.studentId, event ? event.eventId : args.eventId);
        const activeReg = regs.find((r) => r.status === 'confirmed');
        if (!activeReg) {
          return {
            success: false,
            data: null,
            message: `No active registration found to cancel for '${args.eventId}'.`,
          };
        }
        const cancelRes = await cancelRegistration(activeReg.id, user);
        return {
          success: true,
          data: cancelRes.registration,
          message: cancelRes.message,
        };
      }

      // ADMIN ONLY TOOLS
      case 'getEventParticipants': {
        if (user.role !== 'admin') {
          return {
            success: false,
            data: null,
            message: 'Access Denied: Only administrators are authorized to view participant rosters.',
          };
        }
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' not found.` };
        }
        const regs = await getRegistrations(undefined, event.eventId);
        const participants = regs
          .filter((r) => r.status === 'confirmed')
          .map((r) => ({
            registrationId: r.registrationId,
            studentId: r.studentId,
            studentName: r.studentName,
            studentEmail: r.studentEmail,
            registeredAt: r.registrationDate,
            calendarStatus: r.calendarStatus,
          }));
        return {
          success: true,
          data: {
            eventId: event.eventId,
            eventName: event.name,
            totalParticipants: participants.length,
            participants,
          },
          message: `Retrieved ${participants.length} registered participants for '${event.name}'.`,
        };
      }

      case 'createEvent': {
        if (user.role !== 'admin') {
          return {
            success: false,
            data: null,
            message: 'Access Denied: Only administrators can create new college events.',
          };
        }
        const created = await createEvent({
          eventId: args.eventId,
          name: args.name,
          description: args.description,
          date: args.date,
          time: args.time,
          venue: args.venue,
          maxCapacity: Number(args.maxCapacity),
          category: args.category || 'General',
          createdBy: user.studentId,
        });
        return {
          success: true,
          data: created,
          message: `Successfully created event '${created.name}' (${created.eventId}).`,
        };
      }

      case 'updateEvent': {
        if (user.role !== 'admin') {
          return {
            success: false,
            data: null,
            message: 'Access Denied: Only administrators can edit events.',
          };
        }
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' not found.` };
        }
        const updated = await updateEvent(event.id, args);
        return {
          success: true,
          data: updated,
          message: `Successfully updated event '${updated.name}'.`,
        };
      }

      case 'deleteEvent': {
        if (user.role !== 'admin') {
          return {
            success: false,
            data: null,
            message: 'Access Denied: Only administrators can delete events.',
          };
        }
        const event = await resolveEvent(args.eventId);
        if (!event) {
          return { success: false, data: null, message: `Event '${args.eventId}' not found.` };
        }
        await deleteEvent(event.id);
        return {
          success: true,
          data: { eventId: event.eventId, name: event.name },
          message: `Successfully deleted event '${event.name}' (${event.eventId}).`,
        };
      }

      default:
        return { success: false, data: null, message: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return {
      success: false,
      data: null,
      message: err.message || 'An error occurred during tool execution.',
    };
  }
}

// Robust Gemini caller with automatic fallback on transient high-demand spikes
async function callGeminiWithFallback(params: {
  contents: any[];
  systemInstruction: string;
  tools: any[];
}) {
  const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          tools: params.tools,
        },
      });
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.message?.includes('503') ||
        err?.message?.includes('429') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');
      if (isTransient) {
        console.warn(`Model ${model} unavailable due to demand, trying fallback model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// MAIN AGENT CHAT HANDLER
export async function processAgentMessage(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'model'; parts: any[] }>,
  user: User,
  googleAccessToken?: string
): Promise<{
  reply: string;
  toolCalls: ToolExecutionRecord[];
}> {
  // Determine available tools based on user role
  const studentTools = [
    getEventsTool,
    searchEventsTool,
    getEventDetailsTool,
    getStudentRegistrationsTool,
    checkRegistrationTool,
    getRegistrationCountTool,
    registerStudentForEventTool,
    cancelRegistrationTool,
  ];

  const adminTools = [
    ...studentTools,
    getEventParticipantsTool,
    createEventTool,
    updateEventTool,
    deleteEventTool,
  ];

  const activeTools = user.role === 'admin' ? adminTools : studentTools;

  const systemInstruction = `You are CampusPulse AI, the official intelligent event management agent for the college.
Current date: 2026-10-07.
Authenticated User:
- Name: ${user.name}
- Student/Faculty ID: ${user.studentId}
- Email: ${user.email}
- Course/Department: ${user.course}
- Role: ${user.role.toUpperCase()}

CRITICAL RULES:
1. ALWAYS execute backend tools when the user asks questions about events, registrations, seat counts, participant lists, or asks to register or cancel.
2. NEVER guess or fabricate events, IDs, seat counts, or registration states. Always query real application data via tools.
3. When a student says "Register me for [event]", you MUST call the 'registerStudentForEvent' tool with the resolved event ID. The backend will validate student existence, event existence, check duplicate registration, verify capacity, write to Firebase Firestore, and sync to Google Calendar.
4. When asking "Am I registered for [event]?", you MUST call 'checkRegistration'.
5. When asking "How many students have registered?", call 'getRegistrationCount'.
6. If a student attempts to perform administrative actions (e.g., create event, delete event, view participant rosters), politely reject the request explaining that only administrators have permission.
7. Always provide clear, courteous, and accurate responses detailing dates, venues, registration IDs, and calendar sync status where applicable.`;

  const executedRecords: ToolExecutionRecord[] = [];

  try {
    // 1. Initial Call to Gemini with tool definitions
    const contents: any[] = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const initialResponse = await callGeminiWithFallback({
      contents,
      systemInstruction,
      tools: [{ functionDeclarations: activeTools }],
    });

    // 2. Multi-turn tool execution loop (up to 3 turns)
    let currentResponse = initialResponse;
    let currentContents = [...contents];
    let maxTurns = 3;

    while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && maxTurns > 0) {
      maxTurns--;
      const toolResponseParts: any[] = [];

      for (const call of currentResponse.functionCalls) {
        const toolName = call.name || 'unknown';
        const record: ToolExecutionRecord = {
          name: toolName,
          args: (call.args as Record<string, any>) || {},
          status: 'executing',
        };
        executedRecords.push(record);

        const executionResult = await executeAgentTool(toolName, call.args, user, googleAccessToken);
        record.result = executionResult;
        record.status = executionResult.success ? 'success' : 'error';
        if (!executionResult.success) {
          record.errorMessage = executionResult.message;
        }

        const functionResponsePayload: Record<string, any> = {
          name: toolName,
          response: {
            success: executionResult.success,
            message: executionResult.message,
            data: executionResult.data,
          },
        };
        if ((call as any).id) {
          functionResponsePayload.id = (call as any).id;
        }

        toolResponseParts.push({
          functionResponse: functionResponsePayload,
        });
      }

      const modelCallContent = currentResponse.candidates?.[0]?.content;
      currentContents = [
        ...currentContents,
        modelCallContent,
        {
          role: 'user',
          parts: toolResponseParts,
        },
      ];

      currentResponse = await callGeminiWithFallback({
        contents: currentContents,
        systemInstruction,
        tools: [{ functionDeclarations: activeTools }],
      });
    }

    const extractedText =
      currentResponse.text ||
      currentResponse.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join('\n');

    return {
      reply:
        extractedText ||
        (executedRecords.length > 0
          ? executedRecords[executedRecords.length - 1].result?.message
          : 'I have completed your request.'),
      toolCalls: executedRecords,
    };
  } catch (err: any) {
    console.error('Agent processing error:', err);
    return {
      reply: `I encountered an issue processing your request: ${err.message || 'Unknown error'}. Please try again.`,
      toolCalls: executedRecords,
    };
  }
}
