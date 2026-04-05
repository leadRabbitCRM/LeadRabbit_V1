// Inactivity timeout configuration
// Change this value to adjust the inactivity logout time across the app

export const INACTIVITY_TIME = 1800000; // 30 minutes (in milliseconds)

// Warning popup appears this many ms before logout
export const WARNING_BEFORE_LOGOUT = 30000; // 30 seconds

// Derived: when to show the warning popup
export const WARNING_TIME = INACTIVITY_TIME - WARNING_BEFORE_LOGOUT;

// Heartbeat interval - client sends a ping to keep user marked as active
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
