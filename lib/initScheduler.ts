// lib/initScheduler.ts
// This module initializes the cron scheduler when imported
import { startCron } from "./scheduler";

export function initializeScheduler() {
  if (typeof window === 'undefined') {
    startCron();
  }
}

// Auto-initialize when module is imported
if (typeof window === 'undefined') {
  console.log("🚀 [SCHEDULER INIT] Auto-initialization triggered (server-side import detected)");
  initializeScheduler();
}
