// lib/initScheduler.ts
// This module initializes the cron scheduler when imported
import { startCron } from "./scheduler";

export function initializeScheduler() {
  if (typeof window === 'undefined') {
    startCron();
  }
}

// Auto-initialize when module is imported on the server at runtime (not during build)
if (
  typeof window === 'undefined' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.NEXT_RUNTIME === 'nodejs'
) {
  console.log("🚀 [SCHEDULER INIT] Auto-initialization triggered (server-side import detected)");
  initializeScheduler();
}
