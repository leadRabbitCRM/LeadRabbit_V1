import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      // No token = not logged in, silently ignore
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    let email: string | undefined;
    let dbName: string | undefined;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        dbName?: string;
      };
      email = decoded.email;
      dbName = decoded.dbName;
    } catch {
      // Expired/invalid token, don't error out
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    if (!email) {
      return NextResponse.json({ error: "No email in token" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const databaseName = dbName || process.env.DB_NAME;
    const db = client.db(databaseName);

    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          lastHeartbeat: new Date(),
          isOnline: true,
          status: "active",
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Heartbeat error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
