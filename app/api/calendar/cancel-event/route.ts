import { NextRequest, NextResponse } from "next/server";
import { cancelUserCalendarEvent } from "@/lib/googleOAuth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    const { accessToken, eventId } = body;

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

    // Cancel the calendar event
    const result = await cancelUserCalendarEvent(accessToken, eventId);

    return NextResponse.json({
      success: true,
      result,
      message: "Event cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling calendar event:", error);

    return NextResponse.json(
      {
        error: "Failed to cancel calendar event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
