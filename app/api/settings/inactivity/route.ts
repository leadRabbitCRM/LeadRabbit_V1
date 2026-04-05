import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { INACTIVITY_MINUTES } from "@/config/cron";

export const dynamic = "force-dynamic";

/**
 * GET — Returns the per-customer inactivity timeout (in minutes).
 * Accessible by any authenticated user (not admin-only).
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      // Not logged in — return default so client doesn't break
      return NextResponse.json({ inactivityMinutes: INACTIVITY_MINUTES });
    }

    let dbName: string | undefined;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        dbName?: string;
      };
      dbName = decoded.dbName;
    } catch {
      return NextResponse.json({ inactivityMinutes: INACTIVITY_MINUTES });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ inactivityMinutes: INACTIVITY_MINUTES });
    }

    const db = client.db(dbName || process.env.DB_NAME);
    const config = await db
      .collection("settings")
      .findOne({ name: "cronConfig" });

    return NextResponse.json({
      inactivityMinutes: config?.inactivityMinutes ?? INACTIVITY_MINUTES,
    });
  } catch {
    return NextResponse.json({ inactivityMinutes: INACTIVITY_MINUTES });
  }
}
