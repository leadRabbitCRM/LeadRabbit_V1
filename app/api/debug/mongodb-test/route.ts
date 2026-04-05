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
    console.log("Testing MongoDB connection...");
    
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "Failed to connect to MongoDB",
          details: "Client is null - check connection string and network"
        },
        { status: 503 }
      );
    }

    // Test database connection
    const db = client.db(process.env.DB_NAME);
    const adminDb = client.db().admin();
    
    // Ping the database
    const pingResult = await adminDb.ping();
    console.log("MongoDB ping result:", pingResult);

    // Test a simple operation
    const collections = await db.listCollections().toArray();
    
    return NextResponse.json({
      status: "success",
      message: "MongoDB connection successful",
      details: {
        ping: pingResult,
        database: process.env.DB_NAME,
        collections: collections.map(col => col.name),
        connectionInfo: {
          host: client.options?.hosts?.[0] || "unknown",
          ssl: client.options?.tls,
          replicaSet: client.options?.replicaSet,
        }
      }
    });

  } catch (error: any) {
    console.error("MongoDB connection test failed:", error);
    
    return NextResponse.json(
      {
        status: "error",
        message: "MongoDB connection test failed",
        error: {
          name: error?.name || "Unknown",
          message: error?.message || "Unknown error",
          code: error?.code || "Unknown",
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          mongodbUri: process.env.MONGODB_URI ? "configured" : "missing",
          dbName: process.env.DB_NAME || "not set",
        }
      },
      { status: 500 }
    );
  }
}