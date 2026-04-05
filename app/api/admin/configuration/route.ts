import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import {
  CRON_INTERVAL_MINUTES,
  CRON_START_HOUR,
  CRON_END_HOUR,
  STALE_HEARTBEAT_MINUTES,
  INACTIVITY_MINUTES,
} from "@/config/cron";

export const dynamic = "force-dynamic";

// Default values (from config/cron.ts) used as fallback
const DEFAULTS = {
  cronIntervalMinutes: CRON_INTERVAL_MINUTES,
  cronStartHour: CRON_START_HOUR,
  cronEndHour: CRON_END_HOUR,
  staleHeartbeatMinutes: STALE_HEARTBEAT_MINUTES,
  inactivityMinutes: INACTIVITY_MINUTES,
};

/**
 * GET — Fetch the customer's cron/configuration settings
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dbName: string | undefined;
    let role: string | undefined;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        dbName?: string;
        role?: string;
      };
      dbName = decoded.dbName;
      role = decoded.role;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const settingsCollection = db.collection("settings");

    const config = await settingsCollection.findOne({ name: "cronConfig" });

    // Return saved config or defaults
    return NextResponse.json({
      cronStartHour: config?.cronStartHour ?? DEFAULTS.cronStartHour,
      cronEndHour: config?.cronEndHour ?? DEFAULTS.cronEndHour,
      cronIntervalMinutes:
        config?.cronIntervalMinutes ?? DEFAULTS.cronIntervalMinutes,
      staleHeartbeatMinutes:
        config?.staleHeartbeatMinutes ?? DEFAULTS.staleHeartbeatMinutes,
      inactivityMinutes:
        config?.inactivityMinutes ?? DEFAULTS.inactivityMinutes,
    });
  } catch (err) {
    console.error("Error fetching configuration:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT — Update the customer's cron/configuration settings
 */
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dbName: string | undefined;
    let role: string | undefined;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        dbName?: string;
        role?: string;
      };
      dbName = decoded.dbName;
      role = decoded.role;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { cronStartHour, cronEndHour, staleHeartbeatMinutes, inactivityMinutes } = body;

    // Validate
    const startHour = Number(cronStartHour);
    const endHour = Number(cronEndHour);
    const staleMins = Number(staleHeartbeatMinutes);

    if (
      isNaN(startHour) ||
      isNaN(endHour) ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 1 ||
      endHour > 24
    ) {
      return NextResponse.json(
        { error: "Invalid hour values. Start: 0-23, End: 1-24." },
        { status: 400 }
      );
    }

    if (startHour >= endHour) {
      return NextResponse.json(
        { error: "Start hour must be less than end hour." },
        { status: 400 }
      );
    }

    if (isNaN(staleMins) || staleMins < 1 || staleMins > 60) {
      return NextResponse.json(
        {
          error:
            "Invalid stale heartbeat minutes. Must be between 1 and 60.",
        },
        { status: 400 }
      );
    }

    const inactMins = Number(inactivityMinutes);
    if (isNaN(inactMins) || inactMins < 1 || inactMins > 120) {
      return NextResponse.json(
        { error: "Invalid inactivity minutes. Must be between 1 and 120." },
        { status: 400 }
      );
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
    const settingsCollection = db.collection("settings");

    await settingsCollection.updateOne(
      { name: "cronConfig" },
      {
        $set: {
          cronStartHour: startHour,
          cronEndHour: endHour,
          staleHeartbeatMinutes: staleMins,
          inactivityMinutes: inactMins,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: "Configuration updated successfully",
      cronStartHour: startHour,
      cronEndHour: endHour,
      staleHeartbeatMinutes: staleMins,
      inactivityMinutes: inactMins,
    });
  } catch (err) {
    console.error("Error updating configuration:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
