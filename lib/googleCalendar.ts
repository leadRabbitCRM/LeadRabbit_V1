import { google, calendar_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"]; // full calendar access for inserts/updates/deletes

let calendarClient: calendar_v3.Calendar | null = null;

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

function getCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !privateKey || !calendarId) {
    return null;
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    calendarId,
  } as const;
}

function getCalendar() {
  if (calendarClient) return calendarClient;

  const credentials = getCredentials();

  if (!credentials) return null;

  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: SCOPES,
  });

  calendarClient = google.calendar({ version: "v3", auth });

  return calendarClient;
}

export function isCalendarConfigured() {
  return Boolean(getCredentials());
}

export type CalendarEventInput = {
  eventId?: string | null;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: {
    dateTime: string; // ISO string
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string; displayName?: string | null }>;
};

export async function upsertCalendarEvent(
  input: CalendarEventInput,
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getCalendar();
  const credentials = getCredentials();

  if (!calendar || !credentials) {
    return null;
  }

  const eventResource: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: input.start,
    end: input.end,
    attendees: input.attendees,
    reminders: {
      useDefault: true,
    },
  };

  if (input.eventId) {
    const response = await calendar.events.update({
      calendarId: credentials.calendarId,
      eventId: input.eventId,
      requestBody: eventResource,
      sendUpdates: "all",
    });

    return response.data;
  }

  const response = await calendar.events.insert({
    calendarId: credentials.calendarId,
    requestBody: eventResource,
    sendUpdates: "all",
  });

  return response.data;
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendar();
  const credentials = getCredentials();

  if (!calendar || !credentials) {
    return false;
  }

  await calendar.events.delete({
    calendarId: credentials.calendarId,
    eventId,
    sendUpdates: "all",
  });

  return true;
}
