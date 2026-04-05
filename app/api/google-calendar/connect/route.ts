import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";
import { getPerUserAuthUrl, OAuthStatePayload } from "@/lib/googleOAuthPerUser";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/connect
 *
 * Generates a Google OAuth URL for the currently authenticated user.
 * The user's identity (customerId, email, role) is encoded in the OAuth `state`
 * so the callback knows which user to save the tokens for.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const returnPath =
    req.nextUrl.searchParams.get("returnPath") ||
    (auth.role === "admin" ? "/admin" : "/user");

  const state: OAuthStatePayload = {
    customerId: auth.customerId,
    email: auth.email,
    role: auth.role,
    returnPath,
  };

  const authUrl = getPerUserAuthUrl(state);

  return NextResponse.json({ authUrl });
}
