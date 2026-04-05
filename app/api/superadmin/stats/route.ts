import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminDb, getCustomerDb } from "@/lib/multitenancy";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

function verifySuperAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("appToken")?.value;
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role?: string };
    return decoded.role === "superadmin";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!verifySuperAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "MongoDB unavailable" }, { status: 500 });
    }

    const customersCollection = superAdminDb.collection("customers");
    const customers = await customersCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Aggregate per-customer stats in parallel
    const customerStats = await Promise.all(
      customers.map(async (customer) => {
        try {
          const db = client.db(customer.databaseName);

          const [userCount, adminCount, leadCount, employeeCount] = await Promise.all([
            db.collection("users").countDocuments({ role: { $ne: "admin" } }),
            db.collection("users").countDocuments({ role: "admin" }),
            db.collection("leads").countDocuments({}),
            db.collection("employees").countDocuments({}),
          ]);

          return {
            customerId: customer.customerId,
            userCount,
            adminCount,
            leadCount,
            employeeCount,
          };
        } catch {
          return {
            customerId: customer.customerId,
            userCount: 0,
            adminCount: 0,
            leadCount: 0,
            employeeCount: 0,
          };
        }
      })
    );

    // Build lookup map
    const statsMap: Record<string, typeof customerStats[0]> = {};
    customerStats.forEach((s) => {
      statsMap[s.customerId] = s;
    });

    // Platform-wide totals
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.status === "active").length;
    const inactiveCustomers = customers.filter((c) => c.status === "inactive").length;
    const suspendedCustomers = customers.filter((c) => c.status === "suspended").length;

    const totalUsers = customerStats.reduce((sum, s) => sum + s.userCount, 0);
    const totalAdmins = customerStats.reduce((sum, s) => sum + s.adminCount, 0);
    const totalLeads = customerStats.reduce((sum, s) => sum + s.leadCount, 0);
    const totalEmployees = customerStats.reduce((sum, s) => sum + s.employeeCount, 0);

    // Recent customers (last 5)
    const recentCustomers = customers.slice(0, 5).map((c) => ({
      ...(statsMap[c.customerId] || {}),
      customerId: c.customerId,
      customerName: c.customerName,
      adminEmail: c.adminEmail,
      status: c.status,
      createdAt: c.createdAt,
      metadata: c.metadata,
    }));

    return NextResponse.json({
      overview: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        suspendedCustomers,
        totalUsers,
        totalAdmins,
        totalLeads,
        totalEmployees,
      },
      customerStats: statsMap,
      recentCustomers,
    });
  } catch (error) {
    console.error("Error fetching superadmin stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
