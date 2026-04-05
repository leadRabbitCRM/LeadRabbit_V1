import { NextRequest, NextResponse } from "next/server";
import { createUserCalendarEvent } from "@/lib/googleOAuth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { accessToken, event } = body;

    // Validate required fields
    if (!accessToken || !event) {
      return NextResponse.json(
        { error: "Missing required fields: accessToken, event" },
        { status: 400 },
      );
    }

    const { summary, description, start, end, location, attendees } = event;

    if (!summary || !start?.dateTime || !end?.dateTime) {
      return NextResponse.json(
        {
          error:
            "Missing required event fields: summary, start.dateTime, end.dateTime",
        },
        { status: 400 },
      );
    }

    // Validate datetime format
    const startDate = new Date(start.dateTime);
    const endDate = new Date(end.dateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid datetime format. Use ISO 8601 format." },
        { status: 400 },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Create the calendar event
    const createdEvent = await createUserCalendarEvent(accessToken, {
      title: summary,
      description: description || "",
      startTime: start.dateTime,
      endTime: end.dateTime,
      attendees: attendees?.map((a: any) => a.email) || [],
    });

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.summary,
        description: createdEvent.description,
        startTime: createdEvent.start?.dateTime,
        endTime: createdEvent.end?.dateTime,
        htmlLink: createdEvent.htmlLink,
        attendees:
          createdEvent.attendees?.map((attendee) => ({
            email: attendee.email,
            responseStatus: attendee.responseStatus,
          })) || [],
      },
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);

    // Handle specific Google API errors
    if (error.code === 401) {
      return NextResponse.json(
        { error: "Invalid or expired access token" },
        { status: 401 },
      );
    }

    if (error.code === 403) {
      return NextResponse.json(
        { error: "Insufficient permissions to create calendar events" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create calendar event", details: error.message },
      { status: 500 },
    );
  }
}
