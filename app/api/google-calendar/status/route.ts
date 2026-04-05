import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/status
 *
 * Returns the Google Calendar connection status of the current user.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const googleCalendar = auth.userDoc?.googleCalendar as
    | {
        googleEmail?: string;
        googleName?: string;
        connectedAt?: Date;
        expiresAt?: Date;
      }
    | undefined;

  if (!googleCalendar?.googleEmail) {
    return NextResponse.json({
      connected: false,
    });
  }

  return NextResponse.json({
    connected: true,
    googleEmail: googleCalendar.googleEmail,
    googleName: googleCalendar.googleName || null,
    connectedAt: googleCalendar.connectedAt || null,
  });
}
