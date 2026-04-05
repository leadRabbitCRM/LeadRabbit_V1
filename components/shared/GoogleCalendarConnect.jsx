"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Chip, Spinner, addToast } from "@heroui/react";
import { FaGoogle } from "react-icons/fa6";
import {
  LinkIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

/**
 * GoogleCalendarConnect
 *
 * Displays the user's Google Calendar connection status and provides
 * buttons to connect or disconnect their Google account.
 *
 * Usage:
 *   <GoogleCalendarConnect onStatusChange={(connected) => ...} />
 */

export default function GoogleCalendarConnect({ onStatusChange, compact = false }) {
  const [status, setStatus] = useState(null); // null = loading
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Use a ref for the callback to avoid re-triggering the effect on every render
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google-calendar/status", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        onStatusChangeRef.current?.(data.connected);
      } else {
        setStatus({ connected: false });
        onStatusChangeRef.current?.(false);
      }
    } catch {
      setStatus({ connected: false });
      onStatusChangeRef.current?.(false);
    }
  }, []); // stable — no deps that change on every render

  // On mount + when URL has googleCalendarConnected param
  useEffect(() => {
    fetchStatus();

    // Check for OAuth return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("googleCalendarConnected") === "true") {
      addToast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar has been connected successfully!",
        color: "success",
        classNames: {
          base: "bg-green-50 border border-green-200 shadow-lg",
          title: "text-green-800 font-semibold",
          description: "text-green-700",
        },
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchStatus(); // refresh status
    }

    if (urlParams.get("googleCalendarError")) {
      const error = urlParams.get("googleCalendarError");
      addToast({
        title: "Google Calendar Error",
        description: `Failed to connect Google Calendar: ${error}`,
        color: "danger",
        classNames: {
          base: "bg-red-50 border border-red-200 shadow-lg",
          title: "text-red-800 font-semibold",
          description: "text-red-700",
        },
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const returnPath = window.location.pathname;
      const res = await fetch(
        `/api/google-calendar/connect?returnPath=${encodeURIComponent(returnPath)}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        addToast({
          title: "Error",
          description: "Failed to generate Google OAuth URL.",
          color: "danger",
        });
        setIsConnecting(false);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to initiate Google Calendar connection.",
        color: "danger",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/google-calendar/disconnect", {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setStatus({ connected: false });
        onStatusChange?.(false);
        addToast({
          title: "Disconnected",
          description: "Google Calendar has been disconnected.",
          color: "warning",
          classNames: {
            base: "bg-orange-50 border border-orange-200 shadow-lg",
            title: "text-orange-800 font-semibold",
            description: "text-orange-700",
          },
        });
      } else {
        addToast({
          title: "Error",
          description: "Failed to disconnect Google Calendar.",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to disconnect Google Calendar.",
        color: "danger",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Loading state
  if (status === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-default-400">
        <Spinner size="sm" />
        <span>Checking calendar connection...</span>
      </div>
    );
  }

  // Compact mode – just an inline display for the meeting modal
  if (compact) {
    if (status.connected) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <CheckCircleIcon className="w-4 h-4 text-success" />
          <span className="text-success-600">
            Calendar: <strong>{status.googleEmail}</strong>
          </span>
        </div>
      );
    }

    return (
      <Button
        size="sm"
        variant="flat"
        color="primary"
        startContent={<FaGoogle className="w-3 h-3" />}
        isLoading={isConnecting}
        onPress={handleConnect}
        className="text-xs"
      >
        Connect Google Calendar
      </Button>
    );
  }

  // Full mode – card-style display
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-content1 p-4">
      <div className="flex items-center gap-2">
        <FaGoogle className="w-5 h-5 text-red-500" />
        <span className="font-semibold text-sm">Google Calendar</span>
      </div>

      {status.connected ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip
              color="success"
              variant="flat"
              size="sm"
              startContent={<CheckCircleIcon className="w-3.5 h-3.5" />}
            >
              Connected
            </Chip>
            <span className="text-sm text-default-600">
              {status.googleEmail}
            </span>
          </div>
          {status.googleName && (
            <p className="text-xs text-default-400">
              Signed in as {status.googleName}
            </p>
          )}
          <p className="text-xs text-default-400">
            Meeting events will be added to your Google Calendar automatically.
          </p>
          <Button
            size="sm"
            variant="light"
            color="danger"
            startContent={<XMarkIcon className="w-4 h-4" />}
            isLoading={isDisconnecting}
            onPress={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-default-400">
            Connect your Google account to automatically create calendar events
            when you schedule meetings with leads.
          </p>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<LinkIcon className="w-4 h-4" />}
            isLoading={isConnecting}
            onPress={handleConnect}
          >
            Connect Google Calendar
          </Button>
        </div>
      )}
    </div>
  );
}
