import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = [
  "New",
  "Interested",
  "Not Interested",
  "Deal",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

const STATUS_ALIASES: Record<string, AllowedStatus> = {
  inprogress: "Interested",
  interested: "Interested",
  "not interested": "Not Interested",
  deal: "Deal",
  new: "New",
};

function normalizeStatus(value: unknown): AllowedStatus | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const directMatch = ALLOWED_STATUSES.find(
    (status) => status.toLowerCase() === trimmed.toLowerCase(),
  );

  if (directMatch) return directMatch;

  const aliasMatch = STATUS_ALIASES[trimmed.toLowerCase()];

  return aliasMatch ?? null;
}

export async function PATCH(req: NextRequest) {
  try {
    const resolved = await resolveAuthenticatedUser(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, email, role } = resolved;
    const body = await req.json().catch(() => null);

    const leadId = body?.leadId as string | undefined;
    const nextStatus = normalizeStatus(body?.status);

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead identifier is required." },
        { status: 400 },
      );
    }

    if (!nextStatus) {
      return NextResponse.json(
        { error: "Invalid lead status value." },
        { status: 400 },
      );
    }

    const leadsCollection = db.collection("leads");

    const filter: Record<string, unknown> = {};

    // Only filter by assignedTo if the user is not an admin
    if (role !== "admin") {
      filter.assignedTo = email;
    }

    if (ObjectId.isValid(leadId)) {
      filter._id = new ObjectId(leadId);
    } else {
      filter._id = leadId;
    }

    const now = new Date();

    const result = await leadsCollection.updateOne(filter, {
      $set: {
        status: nextStatus,
        updatedAt: now,
      },
    });

    if (!result.matchedCount) {
      return NextResponse.json(
        { error: "Lead not found for the current user." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Lead status updated successfully",
      status: nextStatus,
      updatedAt: now.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update lead status" },
      { status: 500 },
    );
  }
}
