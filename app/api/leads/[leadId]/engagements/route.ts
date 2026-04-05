import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type EngagementPayload = {
  date?: string;
  type?: string;
  customType?: string;
  note?: string;
};

type NormalizedEngagement = {
  _id: ObjectId;
  date: string;
  type: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

function ensureValidDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00`);

  return !Number.isNaN(parsed.getTime());
}

function buildLeadFilter(
  leadId: string,
  email: string,
  role: string,
): Record<string, unknown> {
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

  return filter;
}

function sortEngagements(raw: unknown): NormalizedEngagement[] {
  if (!Array.isArray(raw)) return [];

  const cloned = raw
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
    })) as NormalizedEngagement[];

  return cloned.sort((a, b) => {
    const left = `${a.date ?? ""}-${a.updatedAt?.toString?.() ?? ""}`;
    const right = `${b.date ?? ""}-${b.updatedAt?.toString?.() ?? ""}`;

    return right.localeCompare(left);
  });
}

function resolveEngagementType(payload: EngagementPayload): string | null {
  const customType = payload.customType?.toString().trim();
  if (customType) return customType;

  const type = payload.type?.toString().trim();
  if (type) return type;

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const auth = await resolveAuthenticatedUser(req);

  if (auth.status !== 200) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { leadId } = await params;

  if (!leadId) {
    return NextResponse.json(
      { error: "Lead identifier is required." },
      { status: 400 },
    );
  }

  const leadFilter = buildLeadFilter(leadId, auth.email, auth.role);

  const leadDoc = await auth.db.collection("leads").findOne(leadFilter, {
    projection: { engagements: 1 },
  });

  if (!leadDoc) {
    return NextResponse.json(
      { error: "Lead not found for the current user." },
      { status: 404 },
    );
  }

  const engagements = sortEngagements(leadDoc.engagements);

  return NextResponse.json({ engagements }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead identifier is required." },
        { status: 400 },
      );
    }

    const payload = (await req.json().catch(() => ({}))) as EngagementPayload;

    const date = payload.date?.toString().trim();
    const note = payload.note?.toString().trim() ?? "";
    const type = resolveEngagementType(payload);

    if (!date || !ensureValidDate(date)) {
      return NextResponse.json(
        { error: "A valid date (YYYY-MM-DD) is required." },
        { status: 400 },
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Engagement type is required." },
        { status: 400 },
      );
    }

    const leadFilter = buildLeadFilter(leadId, auth.email, auth.role);

    const leadsCollection = auth.db.collection("leads");

    const leadExists = await leadsCollection.findOne(leadFilter, {
      projection: { _id: 1 },
    });

    if (!leadExists) {
      return NextResponse.json(
        { error: "Lead not found for the current user." },
        { status: 404 },
      );
    }

    const now = new Date();
    const engagementRecord: NormalizedEngagement = {
      _id: new ObjectId(),
      date,
      type,
      note,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.email,
      updatedBy: auth.email,
    };

    const updateResult = await leadsCollection.findOneAndUpdate(
      leadFilter,
      {
        $push: { engagements: engagementRecord as unknown as never },
        $set: { updatedAt: now },
      },
      {
        returnDocument: "after",
      },
    );

    if (!updateResult) {
      console.error("No update result returned");
      return NextResponse.json(
        { error: "Failed to persist engagement." },
        { status: 500 },
      );
    }

    // MongoDB findOneAndUpdate returns { value: document } or { value: null }
    if (!updateResult.value) {
      const verificationDoc = await leadsCollection.findOne(leadFilter, {
        projection: { engagements: 1 },
      });

      if (!verificationDoc) {
        console.error("Lead document not found during verification");
        return NextResponse.json(
          { error: "Failed to persist engagement." },
          { status: 500 },
        );
      }

      // Check if the engagement was successfully added
      const currentEngagements = verificationDoc.engagements || [];
      const engagementExists = currentEngagements.some(
        (eng: any) =>
          eng._id && eng._id.toString() === engagementRecord._id.toString(),
      );

      if (!engagementExists) {
        console.error("Engagement was not inserted");
        return NextResponse.json(
          { error: "Failed to persist engagement." },
          { status: 500 },
        );
      }

      console.log(
        "Engagement successfully inserted, using verification result",
      );
      const engagements = sortEngagements(currentEngagements);
      return NextResponse.json(
        { engagement: engagementRecord, engagements },
        { status: 201 },
      );
    }

    if (!Array.isArray(updateResult.value.engagements)) {
      console.error("Updated document does not have engagements array");
      return NextResponse.json(
        { error: "Failed to persist engagement." },
        { status: 500 },
      );
    }

    const engagements = sortEngagements(updateResult.value.engagements);

    return NextResponse.json(
      { engagement: engagementRecord, engagements },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/leads/[leadId]/engagements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
