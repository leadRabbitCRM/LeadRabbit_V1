// pages/api/test.ts or app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // const email = req.nextUrl.searchParams.get("email");
    const body = await req.json(); // <-- await here is required
    const secret = body.secret; // Assuming secret is passed in the request body
    const token = body.token;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (verified) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // return NextResponse.json(body);
  } catch (err) {
    console.error("Error Retrieving Employee from DB !!", err);

    return NextResponse.json(
      { error: "Error Retrieving Employee from DB !!" },
      { status: 500 },
    );
  }
}
