import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";
import { removeUserGoogleTokens } from "@/lib/googleOAuthPerUser";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/google-calendar/disconnect
 *
 * Removes the user's stored Google Calendar tokens.
 */
export async function DELETE(req: NextRequest) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await removeUserGoogleTokens(auth.db, auth.email);

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully.",
    });
  } catch (err) {
    console.error("Error disconnecting Google Calendar:", err);
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar." },
      { status: 500 },
    );
  }
}
