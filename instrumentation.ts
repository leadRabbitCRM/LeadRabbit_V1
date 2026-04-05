// instrumentation.ts
// This file runs IMMEDIATELY when Next.js server starts (before any other code)
// It's the earliest hook available in Next.js

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log("⚡ [INSTRUMENTATION] Server startup - initializing scheduler");
    const { startCron } = await import('./lib/scheduler');
    startCron();
  }
}
