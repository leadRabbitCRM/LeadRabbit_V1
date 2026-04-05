import { NextRequest, NextResponse } from "next/server";
import { updateUserCalendarEvent } from "@/lib/googleOAuth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      accessToken,
      eventId,
      title,
      description,
      startTime,
      endTime,
      attendees,
    } = body;

    // Validate required fields
    if (!accessToken) {
      console.error("Missing access token");
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 },
      );
    }

    if (!eventId) {
      console.error("Missing event ID");
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 },
      );
    }

    if (!title || !startTime || !endTime) {
      console.error("Missing required event fields");
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 },
      );
    }

    // Update the calendar event
    const updatedEvent = await updateUserCalendarEvent(accessToken, eventId, {
      title,
      description: description || "",
      startTime,
      endTime,
      attendees: attendees || [],
    });

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);

    return NextResponse.json(
      {
        error: "Failed to update calendar event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
