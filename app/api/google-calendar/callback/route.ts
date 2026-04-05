import { NextRequest, NextResponse } from "next/server";
import {
  decodeOAuthState,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  saveUserGoogleTokens,
} from "@/lib/googleOAuthPerUser";
import { getCustomerDb } from "@/lib/multitenancy";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/callback
 *
 * Google redirects here after the user grants consent.
 * We exchange the code for tokens and store them in the user document.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  // Decode state to know which user initiated the flow
  const state = stateParam ? decodeOAuthState(stateParam) : null;
  const fallbackPath = state?.returnPath || "/admin";

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        `${fallbackPath}?googleCalendarError=${encodeURIComponent(error)}`,
        req.url,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        `${fallbackPath}?googleCalendarError=missing_code_or_state`,
        req.url,
      ),
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL(
          `${fallbackPath}?googleCalendarError=no_access_token`,
          req.url,
        ),
      );
    }

    // Get Google user info
    const googleProfile = await getGoogleUserInfo(tokens.access_token);

    if (!googleProfile.email) {
      return NextResponse.redirect(
        new URL(
          `${fallbackPath}?googleCalendarError=no_google_email`,
          req.url,
        ),
      );
    }

    // Get the customer database
    const db = await getCustomerDb(state.customerId);

    if (!db) {
      return NextResponse.redirect(
        new URL(
          `${fallbackPath}?googleCalendarError=database_unavailable`,
          req.url,
        ),
      );
    }

    // Save tokens to the user document
    await saveUserGoogleTokens(
      db,
      state.email,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      {
        email: googleProfile.email,
        name: googleProfile.name ?? undefined,
      },
    );

    // Redirect back with success
    return NextResponse.redirect(
      new URL(`${fallbackPath}?googleCalendarConnected=true`, req.url),
    );
  } catch (err) {
    console.error("Error in Google Calendar callback:", err);
    return NextResponse.redirect(
      new URL(
        `${fallbackPath}?googleCalendarError=callback_failed`,
        req.url,
      ),
    );
  }
}
