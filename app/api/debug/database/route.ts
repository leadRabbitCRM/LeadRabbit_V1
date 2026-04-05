import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(process.env.DB_NAME);

    // Get all collection names
    const collections = await db.listCollections().toArray();

    // Check leads collection specifically
    const leadsCollection = db.collection("leads");
    const leadCount = await leadsCollection.countDocuments();

    // Get sample leads
    const sampleLeads = await leadsCollection.find({}).limit(5).toArray();

    // Check users collection
    const usersCollection = db.collection("users");
    const userCount = await usersCollection.countDocuments();
    const adminUsers = await usersCollection.find({ role: "admin" }).toArray();

    return NextResponse.json(
      {
        database: process.env.DB_NAME,
        collections: collections.map((c) => c.name),
        leads: {
          count: leadCount,
          samples: sampleLeads.map((lead) => ({
            id: lead._id?.toString(),
            name: lead.name,
            email: lead.email,
            assignedTo: lead.assignedTo,
            status: lead.status,
          })),
        },
        users: {
          count: userCount,
          admins: adminUsers.map((user) => ({
            id: user._id?.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          })),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Debug API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Debug API failed", details: errorMessage },
      { status: 500 },
    );
  }
}
