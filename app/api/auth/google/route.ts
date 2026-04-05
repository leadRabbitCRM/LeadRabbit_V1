import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/googleOAuth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const context = searchParams.get("context") || "admin"; // default to admin

    const authUrl = getAuthUrl(context);
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication URL" },
      { status: 500 },
    );
  }
}
