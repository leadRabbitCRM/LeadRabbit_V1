import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";

import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";
import {
  getValidAccessToken,
  upsertUserCalendarEvent,
  deleteUserCalendarEvent,
} from "@/lib/googleOAuthPerUser";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DEFAULT_TIMEZONE = process.env.MEETINGS_TIMEZONE ?? "Asia/Kolkata";

type MeetingPayload = {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  timeZone?: string;
};

function normalizeTimeLabel(label: string): string {
  const trimmed = label.trim();

  return trimmed.toUpperCase().replace(/\s+/g, " ");
}

function parse12HourTime(time: string): string | null {
  const normalized = normalizeTimeLabel(time);
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes > 59) return null;

  if (period === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  const hoursString = hours.toString().padStart(2, "0");
  const minutesString = minutes.toString().padStart(2, "0");

  return `${hoursString}:${minutesString}`;
}

function buildDateTime(date: string, time24: string): string {
  return `${date}T${time24}:00`;
}

function ensureValidDate(date: string): boolean {
  const match = date.match(/^\d{4}-\d{2}-\d{2}$/);

  if (!match) return false;

  const asDate = new Date(date + "T00:00:00");

  return !Number.isNaN(asDate.getTime());
}

function isStartBeforeEnd(start: string, end: string): boolean {
  return start < end;
}

async function fetchLeadMeeting(
  db: Db,
  leadFilter: Record<string, unknown>,
  meetingId: ObjectId,
) {
  const leadsCollection = db.collection("leads");

  return leadsCollection.findOne(
    {
      ...leadFilter,
      "meetings._id": meetingId,
    },
    {
      projection: {
        email: 1,
        name: 1,
        meetings: {
          $filter: {
            input: "$meetings",
            as: "meeting",
            cond: { $eq: ["$$meeting._id", meetingId] },
          },
        },
      },
    },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string; meetingId: string }> },
) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Require Google Calendar connection for rescheduling
  const googleTokens = await getValidAccessToken(auth.db, auth.email);

  if (!googleTokens) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not connected. Please connect your Google account before updating meetings.",
        code: "GOOGLE_CALENDAR_NOT_CONNECTED",
      },
      { status: 400 },
    );
  }

  const { leadId, meetingId } = await params;

  if (!leadId || !meetingId) {
    return NextResponse.json(
      { error: "Lead and meeting identifiers are required." },
      { status: 400 },
    );
  }

  const meetingObjectId = new ObjectId(meetingId);

  const payload = (await req.json().catch(() => ({}))) as MeetingPayload;

  const updateData: Record<string, string> = {};

  if (payload.title) {
    updateData.title = payload.title.toString().trim();
  }

  if (payload.date) {
    updateData.date = payload.date.toString().trim();
    if (!ensureValidDate(updateData.date)) {
      return NextResponse.json(
        { error: "A valid meeting date (YYYY-MM-DD) is required." },
        { status: 400 },
      );
    }
  }

  const startLabel = payload.startTime?.toString().trim();
  const endLabel = payload.endTime?.toString().trim();

  let startTime24: string | null = null;
  let endTime24: string | null = null;

  if (startLabel) {
    startTime24 = parse12HourTime(startLabel);
    if (!startTime24) {
      return NextResponse.json(
        { error: "Start time must be in the format HH:MM AM/PM." },
        { status: 400 },
      );
    }
  }

  if (endLabel) {
    endTime24 = parse12HourTime(endLabel);
    if (!endTime24) {
      return NextResponse.json(
        { error: "End time must be in the format HH:MM AM/PM." },
        { status: 400 },
      );
    }
  }

  const timeZone = payload.timeZone?.toString().trim() || DEFAULT_TIMEZONE;

  const leadFilter: Record<string, unknown> = {};

  // Only filter by assignedTo if the user is not an admin
  if (auth.role !== "admin") {
    leadFilter.assignedTo = auth.email;
  }

  if (ObjectId.isValid(leadId)) {
    leadFilter._id = new ObjectId(leadId);
  } else {
    leadFilter._id = leadId;
  }

  const leadDoc = await fetchLeadMeeting(auth.db, leadFilter, meetingObjectId);

  if (
    !leadDoc ||
    !Array.isArray(leadDoc.meetings) ||
    leadDoc.meetings.length === 0
  ) {
    return NextResponse.json(
      { error: "Meeting not found for the current user." },
      { status: 404 },
    );
  }

  const meeting = leadDoc.meetings[0];

  const date = updateData.date ?? meeting.date;
  const startLabelFinal = startLabel
    ? normalizeTimeLabel(startLabel)
    : meeting.startTimeLabel;
  const endLabelFinal = endLabel
    ? normalizeTimeLabel(endLabel)
    : meeting.endTimeLabel;

  const startTime24Final =
    startTime24 ?? meeting.startDateTime?.split("T")[1]?.slice(0, 5);
  const endTime24Final =
    endTime24 ?? meeting.endDateTime?.split("T")[1]?.slice(0, 5);

  if (!startTime24Final || !endTime24Final) {
    return NextResponse.json(
      { error: "Existing meeting times are invalid." },
      { status: 500 },
    );
  }

  if (!isStartBeforeEnd(startTime24Final, endTime24Final)) {
    return NextResponse.json(
      { error: "End time must be later than start time." },
      { status: 400 },
    );
  }

  const startDateTime = buildDateTime(date, startTime24Final);
  const endDateTime = buildDateTime(date, endTime24Final);

  const attendees = (
    Array.isArray(meeting.attendees) ? meeting.attendees : [auth.email]
  ).filter(
    (email: string, index: number, arr: string[]) =>
      typeof email === "string" && arr.indexOf(email) === index,
  );

  let googleEventId = meeting.googleEventId ?? null;
  let hangoutLink = meeting.hangoutLink ?? null;

  // Update Google Calendar event – meeting is NOT updated unless this succeeds
  try {
    const event = await upsertUserCalendarEvent(googleTokens.accessToken, {
      eventId: meeting.googleEventId ?? undefined,
      summary: updateData.title ?? meeting.title,
      description:
        payload.description?.toString().trim() ?? meeting.description ?? "",
      location: payload.location?.toString().trim() ?? meeting.location ?? "",
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees: attendees.map((email: string) => ({ email })),
    });

    if (event?.id) {
      googleEventId = event.id;
      hangoutLink = event.hangoutLink ?? null;
    } else {
      return NextResponse.json(
        { error: "Google Calendar event was not updated. Please try again." },
        { status: 502 },
      );
    }
  } catch (calendarError: any) {
    console.error("Failed to update Google Calendar event:", calendarError);

    const isScopes =
      calendarError?.status === 403 ||
      calendarError?.message?.includes("insufficient authentication scopes");

    if (isScopes) {
      return NextResponse.json(
        {
          error:
            "Your Google account does not have calendar permissions. Please disconnect and reconnect your Google Calendar.",
          code: "INSUFFICIENT_SCOPES",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update Google Calendar event. Meeting was not updated." },
      { status: 502 },
    );
  }

  const now = new Date();

  const leadsCollection = auth.db.collection("leads");

  const updateResult = await leadsCollection.findOneAndUpdate(
    {
      ...leadFilter,
      "meetings._id": meetingObjectId,
    },
    {
      $set: {
        ...(updateData.title ? { "meetings.$.title": updateData.title } : {}),
        ...(payload.description
          ? { "meetings.$.description": payload.description.toString().trim() }
          : {}),
        ...(payload.location
          ? { "meetings.$.location": payload.location.toString().trim() }
          : {}),
        "meetings.$.date": date,
        "meetings.$.startTimeLabel": startLabelFinal,
        "meetings.$.endTimeLabel": endLabelFinal,
        "meetings.$.startDateTime": startDateTime,
        "meetings.$.endDateTime": endDateTime,
        "meetings.$.timeZone": timeZone,
        "meetings.$.googleEventId": googleEventId,
        "meetings.$.hangoutLink": hangoutLink,
        "meetings.$.googleCalendarSynced": true,
        "meetings.$.status": "scheduled",
        "meetings.$.updatedAt": now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  // MongoDB driver v7 returns the document directly (not wrapped in .value)
  const updatedDoc = (updateResult as any)?.value ?? updateResult;

  if (!updatedDoc) {
    return NextResponse.json(
      { error: "Failed to update meeting." },
      { status: 500 },
    );
  }

  const updatedMeetings = updatedDoc.meetings ?? [];

  return NextResponse.json({ meetings: updatedMeetings }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string; meetingId: string }> },
) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Get user's Google tokens (needed to cancel Google Calendar event)
  const googleTokens = await getValidAccessToken(auth.db, auth.email);

  const { leadId, meetingId } = await params;

  if (!leadId || !meetingId) {
    return NextResponse.json(
      { error: "Lead and meeting identifiers are required." },
      { status: 400 },
    );
  }

  const meetingObjectId = new ObjectId(meetingId);

  const leadFilter: Record<string, unknown> = {};

  // Only filter by assignedTo if the user is not an admin
  if (auth.role !== "admin") {
    leadFilter.assignedTo = auth.email;
  }

  if (ObjectId.isValid(leadId)) {
    leadFilter._id = new ObjectId(leadId);
  } else {
    leadFilter._id = leadId;
  }

  const leadDoc = await fetchLeadMeeting(auth.db, leadFilter, meetingObjectId);

  if (
    !leadDoc ||
    !Array.isArray(leadDoc.meetings) ||
    leadDoc.meetings.length === 0
  ) {
    return NextResponse.json(
      { error: "Meeting not found for the current user." },
      { status: 404 },
    );
  }

  const meeting = leadDoc.meetings[0];

  // Cancel Google Calendar event if the user has connected their account
  if (meeting.googleEventId && googleTokens) {
    try {
      await deleteUserCalendarEvent(googleTokens.accessToken, meeting.googleEventId);
    } catch (calendarError) {
      console.error("Failed to delete Google Calendar event:", calendarError);
      // Continue – the meeting will be cancelled locally
    }
  }

  const now = new Date();

  const leadsCollection = auth.db.collection("leads");

  const updateResult = await leadsCollection.findOneAndUpdate(
    {
      ...leadFilter,
      "meetings._id": meetingObjectId,
    },
    {
      $set: {
        "meetings.$.status": "cancelled",
        "meetings.$.cancelledAt": now,
        "meetings.$.updatedAt": now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  // MongoDB driver v7 returns the document directly (not wrapped in .value)
  const cancelledDoc = (updateResult as any)?.value ?? updateResult;

  if (!cancelledDoc) {
    return NextResponse.json(
      { error: "Failed to cancel meeting." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { meetings: cancelledDoc.meetings ?? [] },
    { status: 200 },
  );
}
