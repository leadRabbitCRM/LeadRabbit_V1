import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, getUserInfo } from "@/lib/googleOAuth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // Get the state parameter for redirect context

    if (error) {
      console.error("OAuth error:", error);
      // Default fallback redirect
      const fallbackUrl = state === "user" ? "/user" : "/admin/calendar";
      return NextResponse.redirect(
        new URL(
          `${fallbackUrl}?error=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    if (!code) {
      const fallbackUrl = state === "user" ? "/user" : "/admin/calendar";
      return NextResponse.redirect(
        new URL(`${fallbackUrl}?error=no_code`, request.url),
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      const fallbackUrl = state === "user" ? "/user" : "/admin/calendar";
      return NextResponse.redirect(
        new URL(`${fallbackUrl}?error=no_access_token`, request.url),
      );
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);

    // Determine redirect URL based on context
    let redirectPath = "/admin/calendar"; // default

    if (state === "user") {
      redirectPath = "/user";
    } else if (state === "admin") {
      redirectPath = "/admin";
    }

    // Create redirect URL with tokens
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set("access_token", tokens.access_token);
    redirectUrl.searchParams.set("user_email", userInfo.email || "");
    redirectUrl.searchParams.set("user_name", userInfo.name || "");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    const fallbackUrl = "/admin/calendar";
    return NextResponse.redirect(
      new URL(`${fallbackUrl}?error=callback_error`, request.url),
    );
  }
}
