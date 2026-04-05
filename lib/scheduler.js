import cron from "node-cron";
import clientPromise from "@/lib/mongodb";
import { getSuperAdminDb } from "@/lib/multitenancy";
import { CRON_INTERVAL_MINUTES, CRON_START_HOUR, CRON_END_HOUR, STALE_HEARTBEAT_MINUTES } from "@/config/cron";

// Default stale threshold from config (used as fallback)
const DEFAULT_STALE_HEARTBEAT_MS = STALE_HEARTBEAT_MINUTES * 60 * 1000;

/**
 * Read per-customer cron config from their settings collection.
 * Falls back to static config/cron.ts defaults if not set.
 */
async function getCustomerCronConfig(db) {
  try {
    const config = await db.collection("settings").findOne({ name: "cronConfig" });
    return {
      cronStartHour: config?.cronStartHour ?? CRON_START_HOUR,
      cronEndHour: config?.cronEndHour ?? CRON_END_HOUR,
      staleHeartbeatMs: (config?.staleHeartbeatMinutes ?? STALE_HEARTBEAT_MINUTES) * 60 * 1000,
    };
  } catch {
    return {
      cronStartHour: CRON_START_HOUR,
      cronEndHour: CRON_END_HOUR,
      staleHeartbeatMs: DEFAULT_STALE_HEARTBEAT_MS,
    };
  }
}

async function markStaleUsersInactive() {
  try {
    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable for stale user cleanup");
      return;
    }

    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      console.error("Super admin database unavailable for stale user cleanup");
      return;
    }

    const customersCollection = superAdminDb.collection("customers");
    const activeCustomers = await customersCollection
      .find({ status: "active" })
      .toArray();

    for (const customer of activeCustomers) {
      const db = client.db(customer.databaseName);
      const customerConfig = await getCustomerCronConfig(db);
      const cutoff = new Date(Date.now() - customerConfig.staleHeartbeatMs);

      const result = await db.collection("users").updateMany(
        {
          isOnline: true,
          $or: [
            { lastHeartbeat: { $lt: cutoff } },
            { lastHeartbeat: { $exists: false } },
          ],
        },
        { $set: { isOnline: false, status: "inactive" } }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[${customer.customerName}] 🔴 Marked ${result.modifiedCount} stale user(s) as inactive`
        );
      }
    }
  } catch (err) {
    console.error("Error marking stale users inactive:", err);
  }
}

async function assignLeads() {
  try {
    const client = await clientPromise;
    if (!client) return;

    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return;

    const customersCollection = superAdminDb.collection("customers");
    const activeCustomers = await customersCollection
      .find({ status: "active" })
      .toArray();

    if (activeCustomers.length === 0) return;

    const now = new Date();
    const istHour = parseInt(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));

    for (const customer of activeCustomers) {
      const db = client.db(customer.databaseName);
      const customerConfig = await getCustomerCronConfig(db);

      // Skip lead assignment if outside this customer's active time window
      if (istHour < customerConfig.cronStartHour || istHour >= customerConfig.cronEndHour) {
        continue;
      }

      await assignLeadsForCustomer(db, customer.customerName);
    }
  } catch (err) {
    console.error("Lead assignment error:", err);
  }
}

async function assignLeadsForCustomer(db, customerName) {
  try {
    const usersCollection = db.collection("users");
    const leadsCollection = db.collection("leads");
    const settingsCollection = db.collection("settings");

    const onlineUsers = await usersCollection
      .find({ isOnline: true, isVerified: true })
      .sort({ email: 1 })
      .toArray();

    if (onlineUsers.length === 0) return;

    const unassignedLeads = await leadsCollection
      .find({
        $or: [{ assignedTo: "" }, { assignedTo: null }],
      })
      .toArray();

    if (unassignedLeads.length === 0) return;

    // Calculate leads per user: unassigned leads / online users, max 4
    const leadsPerUser = Math.min(
      Math.ceil(unassignedLeads.length / onlineUsers.length),
      4
    );

    const settings = await settingsCollection.findOne({
      name: "leadAssignment",
    });
    let lastIndex = settings?.lastAssignedIndex ?? -1;

    // Decide starting index
    let userIndex;
    const stillOnline = onlineUsers.find(
      (u) => u.email === settings?.lastAssignedUser,
    );

    if (settings?.lastAssignedUser && stillOnline) {
      userIndex = (lastIndex + 1) % onlineUsers.length;
    } else {
      userIndex = (lastIndex >= 0 ? lastIndex : 0) % onlineUsers.length;
    }

    // Assign leads in batches per user
    let assignedCount = 0;
    const totalToAssign = Math.min(
      leadsPerUser * onlineUsers.length,
      unassignedLeads.length
    );

    for (let i = 0; i < totalToAssign; i++) {
      const lead = unassignedLeads[i];
      const user = onlineUsers[userIndex];

      await leadsCollection.updateOne(
        { _id: lead._id },
        { $set: { assignedTo: user.email, assignedAt: new Date() } },
      );

      assignedCount++;

      // Move to next user after assigning leadsPerUser
      if ((i + 1) % leadsPerUser === 0) {
        userIndex = (userIndex + 1) % onlineUsers.length;
      }
    }

    // Update settings with new pointer
    const newLastIndex = userIndex;
    const newLastUser = onlineUsers[newLastIndex].email;

    await settingsCollection.updateOne(
      { name: "leadAssignment" },
      {
        $set: {
          lastAssignedIndex: newLastIndex,
          lastAssignedUser: newLastUser,
          lastAssignedAt: new Date(),
        },
      },
      { upsert: true },
    );

    if (assignedCount > 0) {
      console.log(`[${customerName}] ✅ Assigned ${assignedCount} leads`);
    }
  } catch (err) {
    console.error(`Error assigning leads for ${customerName}:`, err);
  }
}

// Export for manual triggering (testing/debugging)
export async function assignLeadsManually() {
  console.log("🔧 Manual lead assignment triggered");
  await assignLeads();
}

// Track active cron task to prevent duplicates (survives hot reload)
const globalCron = globalThis;

// CRON Job - runs every 1 minute while app is running
export function startCron() {
  if (globalCron.__leadRabbitCron) {
    console.log("⚠️ Scheduler already running, skipping duplicate");
    return globalCron.__leadRabbitCron;
  }

  console.log("🚀 Scheduler starting...");
  
  // Run immediately on startup
  markStaleUsersInactive().catch((err) => console.error("Stale cleanup failed:", err));
  assignLeads().catch((err) => console.error("Initial assignment failed:", err));
  
  // CRON: runs at configured interval across a broad window
  // Per-customer time windows are checked inside assignLeads()
  const cronPattern = `${CRON_INTERVAL_MINUTES} * * * *`;
  
  globalCron.__leadRabbitCron = cron.schedule(cronPattern, () => {
    const now = new Date();
    console.log("⏰ [CRON] Running at", now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), "IST");
    assignLeads().catch((err) => console.error("Assignment failed:", err));
    markStaleUsersInactive().catch((err) => console.error("Stale cleanup failed:", err));
  });
  
  console.log(`✅ Scheduler active (${CRON_INTERVAL_MINUTES} min, per-customer time windows from DB)`);
  return globalCron.__leadRabbitCron;
}
