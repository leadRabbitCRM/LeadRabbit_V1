/**
 * Per-User Google OAuth for Calendar Integration
 *
 * Each user connects their own Google account. Tokens (access + refresh)
 * are stored in the user document inside the customer database.
 *
 * Flow:
 *  1. User clicks "Connect Google Calendar"
 *  2. Server generates an OAuth URL with the user's identity encoded in `state`
 *  3. After Google consent, callback stores tokens in the user doc
 *  4. Meeting creation reads tokens from user doc, refreshes if needed
 */

import { google, calendar_v3 } from "googleapis";
import { Db, ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// OAuth2 client (uses the single Web-client credential from .env)
// ---------------------------------------------------------------------------

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface OAuthStatePayload {
  customerId: string;
  email: string;
  role: string;
  /** Where to redirect the user after callback */
  returnPath?: string;
}

export function getPerUserAuthUrl(state: OAuthStatePayload): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Always ask so we get a refresh token
    state: Buffer.from(JSON.stringify(state)).toString("base64"),
  });
}

export function decodeOAuthState(stateParam: string): OAuthStatePayload | null {
  try {
    const decoded = Buffer.from(stateParam, "base64").toString("utf-8");
    return JSON.parse(decoded) as OAuthStatePayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token exchange & user info
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getGoogleUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

// ---------------------------------------------------------------------------
// Token storage helpers  (stored in the user doc: `googleCalendar` field)
// ---------------------------------------------------------------------------

export interface StoredGoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date; // when the access token expires
  googleEmail: string;
  googleName?: string;
  connectedAt: Date;
}

/**
 * Save Google OAuth tokens to a user document.
 */
export async function saveUserGoogleTokens(
  db: Db,
  userEmail: string,
  tokens: {
    access_token: string;
    refresh_token?: string | null;
    expiry_date?: number | null;
  },
  googleProfile: { email: string; name?: string },
) {
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // default 1 hour

  const usersCollection = db.collection("users");

  // If we don't have a new refresh_token, keep the old one
  const existingUser = await usersCollection.findOne({ email: userEmail });
  const existingRefreshToken =
    existingUser?.googleCalendar?.refreshToken ?? null;

  const refreshToken = tokens.refresh_token || existingRefreshToken;

  if (!refreshToken) {
    throw new Error(
      "No refresh token available. Please revoke access and reconnect.",
    );
  }

  const googleCalendar: StoredGoogleTokens = {
    accessToken: tokens.access_token!,
    refreshToken,
    expiresAt,
    googleEmail: googleProfile.email,
    googleName: googleProfile.name,
    connectedAt: existingUser?.googleCalendar?.connectedAt ?? new Date(),
  };

  await usersCollection.updateOne(
    { email: userEmail },
    { $set: { googleCalendar, updatedAt: new Date() } },
  );

  return googleCalendar;
}

/**
 * Remove Google Calendar connection from a user document.
 */
export async function removeUserGoogleTokens(db: Db, userEmail: string) {
  const usersCollection = db.collection("users");
  await usersCollection.updateOne(
    { email: userEmail },
    { $unset: { googleCalendar: "" }, $set: { updatedAt: new Date() } },
  );
}

/**
 * Load stored tokens and refresh if expired.
 * Returns a valid access token or null.
 */
export async function getValidAccessToken(
  db: Db,
  userEmail: string,
): Promise<{ accessToken: string; googleEmail: string } | null> {
  const usersCollection = db.collection("users");
  const user = await usersCollection.findOne({ email: userEmail });

  if (!user?.googleCalendar?.refreshToken) {
    return null; // user hasn't connected
  }

  const stored = user.googleCalendar as StoredGoogleTokens;

  // If the token is still valid (with 5 min buffer), return it
  const bufferMs = 5 * 60 * 1000;
  if (stored.accessToken && new Date(stored.expiresAt).getTime() - bufferMs > Date.now()) {
    return { accessToken: stored.accessToken, googleEmail: stored.googleEmail };
  }

  // Token expired – refresh it
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: stored.refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Persist new tokens
    await usersCollection.updateOne(
      { email: userEmail },
      {
        $set: {
          "googleCalendar.accessToken": credentials.access_token,
          "googleCalendar.expiresAt": newExpiresAt,
          updatedAt: new Date(),
        },
      },
    );

    return {
      accessToken: credentials.access_token!,
      googleEmail: stored.googleEmail,
    };
  } catch (error) {
    console.error("Failed to refresh Google token for", userEmail, error);
    // Token might have been revoked – clear it
    await usersCollection.updateOne(
      { email: userEmail },
      { $unset: { googleCalendar: "" }, $set: { updatedAt: new Date() } },
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Calendar operations (using per-user tokens)
// ---------------------------------------------------------------------------

function getAuthenticatedCalendar(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CalendarEventInput {
  eventId?: string | null;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string | null }>;
}

/**
 * Create or update a Google Calendar event using a user's access token.
 */
export async function upsertUserCalendarEvent(
  accessToken: string,
  input: CalendarEventInput,
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getAuthenticatedCalendar(accessToken);

  const eventResource: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: input.start,
    end: input.end,
    attendees: input.attendees?.map((a) => ({
      email: a.email,
      displayName: a.displayName ?? undefined,
    })),
    reminders: { useDefault: true },
  };

  if (input.eventId) {
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: input.eventId,
      requestBody: eventResource,
      sendUpdates: "all",
    });
    return response.data;
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventResource,
    sendUpdates: "all",
  });

  return response.data;
}

/**
 * Delete a Google Calendar event using a user's access token.
 */
export async function deleteUserCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<boolean> {
  const calendar = getAuthenticatedCalendar(accessToken);

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });

  return true;
}
