import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";

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

async function fetchLeadEngagement(
  db: Db,
  leadFilter: Record<string, unknown>,
  engagementId: ObjectId,
) {
  return db.collection("leads").findOne(
    {
      ...leadFilter,
      "engagements._id": engagementId,
    },
    {
      projection: {
        engagements: {
          $filter: {
            input: "$engagements",
            as: "engagement",
            cond: { $eq: ["$$engagement._id", engagementId] },
          },
        },
      },
    },
  );
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string; engagementId: string }> },
) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { leadId, engagementId } = await params;

    if (!leadId || !engagementId) {
      return NextResponse.json(
        { error: "Lead and engagement identifiers are required." },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(engagementId)) {
      return NextResponse.json(
        { error: "Invalid engagement identifier." },
        { status: 400 },
      );
    }

    const engagementObjectId = new ObjectId(engagementId);

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

    const leadDoc = await fetchLeadEngagement(
      auth.db,
      leadFilter,
      engagementObjectId,
    );

    if (
      !leadDoc ||
      !Array.isArray(leadDoc.engagements) ||
      leadDoc.engagements.length === 0
    ) {
      return NextResponse.json(
        { error: "Engagement not found for the current user." },
        { status: 404 },
      );
    }

    const now = new Date();

    const updateResult = await auth.db.collection("leads").findOneAndUpdate(
      {
        ...leadFilter,
        "engagements._id": engagementObjectId,
      },
      {
        $set: {
          "engagements.$.date": date,
          "engagements.$.type": type,
          "engagements.$.note": note,
          "engagements.$.updatedAt": now,
          "engagements.$.updatedBy": auth.email,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!updateResult) {
      console.error("No update result returned for patch");
      return NextResponse.json(
        { error: "Failed to update engagement." },
        { status: 500 },
      );
    }

    // MongoDB findOneAndUpdate returns { value: document } or { value: null }
    if (!updateResult.value) {
      const verificationDoc = await auth.db
        .collection("leads")
        .findOne(leadFilter, { projection: { engagements: 1 } });

      if (!verificationDoc) {
        console.error("Lead document not found during verification");
        return NextResponse.json(
          { error: "Failed to update engagement." },
          { status: 500 },
        );
      }

      // Check if the engagement was successfully updated
      const currentEngagements = verificationDoc.engagements || [];
      const updatedEngagement = currentEngagements.find(
        (eng: any) =>
          eng._id && eng._id.toString() === engagementObjectId.toString(),
      );

      if (!updatedEngagement) {
        console.error("Engagement not found after update");
        return NextResponse.json(
          { error: "Failed to update engagement." },
          { status: 500 },
        );
      }

      // Verify the engagement was actually updated
      if (updatedEngagement.date !== date || updatedEngagement.type !== type) {
        console.error("Engagement was not properly updated");
        return NextResponse.json(
          { error: "Failed to update engagement." },
          { status: 500 },
        );
      }

      const engagements = sortEngagements(currentEngagements);
      return NextResponse.json({ engagements }, { status: 200 });
    }

    if (!Array.isArray(updateResult.value.engagements)) {
      console.error("Updated document does not have engagements array");
      return NextResponse.json(
        { error: "Failed to update engagement." },
        { status: 500 },
      );
    }

    const engagements = sortEngagements(updateResult.value.engagements);

    return NextResponse.json({ engagements }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in PATCH /api/leads/[leadId]/engagements/[engagementId]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string; engagementId: string }> },
) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { leadId, engagementId } = await params;

    if (!leadId || !engagementId) {
      return NextResponse.json(
        { error: "Lead and engagement identifiers are required." },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(engagementId)) {
      return NextResponse.json(
        { error: "Invalid engagement identifier." },
        { status: 400 },
      );
    }

    const engagementObjectId = new ObjectId(engagementId);

    const leadFilter = buildLeadFilter(leadId, auth.email, auth.role);

    const existing = await fetchLeadEngagement(
      auth.db,
      leadFilter,
      engagementObjectId,
    );

    if (
      !existing ||
      !Array.isArray(existing.engagements) ||
      existing.engagements.length === 0
    ) {
      return NextResponse.json(
        { error: "Engagement not found for the current user." },
        { status: 404 },
      );
    }

    const now = new Date();

    console.log("About to perform delete with filter:", {
      leadFilter,
      engagementObjectId,
      engagementIdString: engagementObjectId.toString(),
    });

    const updateResult = await auth.db.collection("leads").findOneAndUpdate(
      {
        ...leadFilter,
        "engagements._id": engagementObjectId,
      },
      {
        $pull: {
          engagements: { _id: engagementObjectId } as unknown as never,
        },
        $set: { updatedAt: now },
      },
      {
        returnDocument: "after",
      },
    );

    // Check if the operation was acknowledged, even if value is null
    if (!updateResult) {
      console.error("No update result returned for delete");
      return NextResponse.json(
        { error: "Failed to delete engagement." },
        { status: 500 },
      );
    }

    // If no document was returned, it might be a MongoDB driver issue
    // Let's verify the engagement was actually deleted by querying the document
    if (!updateResult.value) {
      const verificationDoc = await auth.db
        .collection("leads")
        .findOne(leadFilter, { projection: { engagements: 1 } });

      if (!verificationDoc) {
        console.error("Lead document not found during verification");
        return NextResponse.json(
          { error: "Failed to delete engagement." },
          { status: 500 },
        );
      }

      // Check if the engagement was successfully removed
      const remainingEngagements = verificationDoc.engagements || [];
      const engagementStillExists = remainingEngagements.some(
        (eng: any) =>
          eng._id && eng._id.toString() === engagementObjectId.toString(),
      );

      if (engagementStillExists) {
        console.error("Engagement was not deleted");
        return NextResponse.json(
          { error: "Failed to delete engagement." },
          { status: 500 },
        );
      }

      const engagements = sortEngagements(remainingEngagements);
      return NextResponse.json({ engagements }, { status: 200 });
    }

    // Standard path when document is returned
    const engagements = sortEngagements(updateResult.value.engagements || []);

    return NextResponse.json({ engagements }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in DELETE /api/leads/[leadId]/engagements/[engagementId]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
