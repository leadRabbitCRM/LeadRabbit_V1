import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const db = auth.db;
    const usersCollection = db.collection("users");

    // Get current user's favorites
    const user = await usersCollection.findOne(
      { email: auth.email },
      { projection: { favorites: 1 } }
    );

    let favorites = user?.favorites || [];

    // Toggle favorite
    if (favorites.includes(leadId)) {
      favorites = favorites.filter((id: string) => id !== leadId);
    } else {
      favorites.push(leadId);
    }

    // Update user's favorites
    await usersCollection.updateOne(
      { email: auth.email },
      { $set: { favorites } }
    );

    return NextResponse.json({ favorites, success: true });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}
