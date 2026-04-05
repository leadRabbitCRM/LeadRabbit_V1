import { google } from "googleapis";

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// Get authorization URL
export function getAuthUrl(context: string = "admin") {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: context, // Add state parameter to track context
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Create calendar event with user's OAuth token
export async function createUserCalendarEvent(
  accessToken: string,
  eventData: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
  },
) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: "UTC",
    },
    attendees: eventData.attendees?.map((email) => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
}

// Update/Reschedule calendar event
export async function updateUserCalendarEvent(
  accessToken: string,
  eventId: string,
  eventData: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
  },
) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: "UTC",
    },
    attendees: eventData.attendees?.map((email) => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  try {
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: eventId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
}

// Cancel/Delete calendar event
export async function cancelUserCalendarEvent(
  accessToken: string,
  eventId: string,
) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return { success: true, message: "Event cancelled successfully" };
  } catch (error) {
    console.error("Error cancelling calendar event:", error);
    throw error;
  }
}

// Get user info
export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return data;
}
