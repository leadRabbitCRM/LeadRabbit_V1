// Cron job configuration
// Change these values to adjust the lead assignment schedule

// How often the cron runs (in cron syntax within the time window)
// Examples: "*/5" = every 5 min, "*/10" = every 10 min, "*/15" = every 15 min
export const CRON_INTERVAL_MINUTES = "*/30";

// Time window for lead assignment (24-hour format, IST)
export const CRON_START_HOUR = 9;   // 9 AM IST
export const CRON_END_HOUR = 18;    // 6 PM IST (exclusive)

// Stale heartbeat threshold — if no heartbeat for this long, mark user inactive
export const STALE_HEARTBEAT_MINUTES = 30; // 30 minutes

// Default user inactivity timeout (minutes) — auto-logout after this idle time
export const INACTIVITY_MINUTES = 30; // 30 minutes
