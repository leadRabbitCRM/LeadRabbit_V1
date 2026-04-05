"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;
      
      // Add event listeners for service worker updates
      wb.addEventListener("controlling", () => {
        window.location.reload();
      });

      wb.addEventListener("waiting", () => {
        // Show update available notification
        if (confirm("A new version is available! Click OK to update.")) {
          wb.messageSkipWaiting();
        }
      });

      wb.register();
    }
  }, []);

  return null;
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    workbox: any;
  }
}