"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Spinner,
  addToast,
  Divider,
} from "@heroui/react";
import {
  Cog6ToothIcon,
  ClockIcon,
  ArrowPathIcon,
  UserIcon,
} from "@heroicons/react/24/solid";

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i); // 0-24

function formatHour(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h === 24) return "12:00 AM (next day)";
  if (h > 12) return `${h - 12}:00 PM`;
  return `${h}:00 AM`;
}

export default function ConfigurationPage() {
  const [cronStartHour, setCronStartHour] = useState(9);
  const [cronEndHour, setCronEndHour] = useState(18);
  const [inactivityMinutes, setInactivityMinutes] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedValues, setSavedValues] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  // Track changes
  useEffect(() => {
    if (!savedValues) return;
    const changed =
      cronStartHour !== savedValues.cronStartHour ||
      cronEndHour !== savedValues.cronEndHour ||
      inactivityMinutes !== savedValues.inactivityMinutes;
    setHasChanges(changed);
  }, [cronStartHour, cronEndHour, inactivityMinutes, savedValues]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/configuration", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load configuration");
      const data = await res.json();
      setCronStartHour(data.cronStartHour);
      setCronEndHour(data.cronEndHour);
      setInactivityMinutes(data.inactivityMinutes);
      setSavedValues({
        cronStartHour: data.cronStartHour,
        cronEndHour: data.cronEndHour,
        inactivityMinutes: data.inactivityMinutes,
      });
    } catch (err) {
      console.error("Error loading config:", err);
      addToast({
        title: "Configuration",
        description: "Failed to load configuration settings.",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate
    if (cronStartHour >= cronEndHour) {
      addToast({
        title: "Validation Error",
        description: "Start hour must be earlier than end hour.",
        color: "warning",
      });
      return;
    }

    if (inactivityMinutes < 1 || inactivityMinutes > 120) {
      addToast({
        title: "Validation Error",
        description: "Inactivity timeout must be between 1 and 120 minutes.",
        color: "warning",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/configuration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cronStartHour,
          cronEndHour,
          staleHeartbeatMinutes: inactivityMinutes,
          inactivityMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSavedValues({
        cronStartHour: data.cronStartHour,
        cronEndHour: data.cronEndHour,
        inactivityMinutes: data.inactivityMinutes,
      });
      setHasChanges(false);

      addToast({
        title: "Configuration Saved",
        description: "Your cron schedule settings have been updated.",
        color: "success",
      });
    } catch (err) {
      console.error("Error saving config:", err);
      addToast({
        title: "Error",
        description: err.message || "Failed to save configuration.",
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!savedValues) return;
    setCronStartHour(savedValues.cronStartHour);
    setCronEndHour(savedValues.cronEndHour);
    setInactivityMinutes(savedValues.inactivityMinutes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700">
        <div className="absolute inset-0 bg-black/10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-3 md:px-6 py-6 md:py-10">
          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Cog6ToothIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-xl md:text-4xl font-bold text-white leading-tight">
                  Configuration
                </h1>
                <p className="text-indigo-100 text-sm md:text-lg mt-0.5 md:mt-1">
                  Manage your lead assignment schedule
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-3 md:px-6 py-4 md:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner size="lg" color="primary" />
              <p className="text-gray-500 mt-4 font-medium">
                Loading configuration...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lead Assignment Schedule Card */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100/60 px-4 md:px-8 py-3 md:py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ClockIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-xl font-bold text-gray-800">
                      Lead Assignment Schedule
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">
                      Set the active hours for automatic lead assignment (IST)
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="px-4 md:px-8 py-4 md:py-6 space-y-6">
                {/* Time Window */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 md:p-6 border border-indigo-100">
                  <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                    Active Time Window
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Leads will only be assigned to online employees during this
                    time window. Outside these hours, leads will remain
                    unassigned until the next active window.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Start Hour (IST)
                      </label>
                      <select
                        value={cronStartHour}
                        onChange={(e) =>
                          setCronStartHour(Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        {HOUR_OPTIONS.filter((h) => h < 24).map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)} ({h}:00)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        End Hour (IST)
                      </label>
                      <select
                        value={cronEndHour}
                        onChange={(e) =>
                          setCronEndHour(Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        {HOUR_OPTIONS.filter((h) => h > 0).map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)} ({h}:00)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="mt-4 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-100 rounded-lg px-3 py-2">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Leads assigned between{" "}
                      <strong>{formatHour(cronStartHour)}</strong> and{" "}
                      <strong>{formatHour(cronEndHour)}</strong> IST
                    </span>
                  </div>
                </div>

                <Divider />

                {/* User Inactivity Timeout */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 md:p-6 border border-orange-100">
                  <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                    User Inactivity Timeout
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    If an employee is idle (no mouse/keyboard/touch activity)
                    for this long, they will be automatically logged out and
                    marked as offline. A warning popup appears 30 seconds
                    before logout. Employees marked offline won&apos;t receive
                    new leads.
                  </p>
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Inactivity Timeout (minutes)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={String(inactivityMinutes)}
                      onValueChange={(val) =>
                        setInactivityMinutes(Number(val) || 1)
                      }
                      variant="bordered"
                      size="md"
                      classNames={{
                        inputWrapper: "bg-white border-orange-200",
                      }}
                      endContent={
                        <span className="text-xs text-gray-400">min</span>
                      }
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {hasChanges && (
                    <Button
                      variant="flat"
                      color="default"
                      onPress={handleReset}
                      startContent={
                        <ArrowPathIcon className="w-4 h-4" />
                      }
                    >
                      Reset
                    </Button>
                  )}
                  <Button
                    color="primary"
                    onPress={handleSave}
                    isLoading={isSaving}
                    isDisabled={!hasChanges || isSaving}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold"
                  >
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Info Card */}
            <Card className="shadow-md border-0 bg-blue-50/60">
              <CardBody className="px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Cog6ToothIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xs md:text-sm text-blue-800">
                    <p className="font-semibold mb-1">How it works</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>
                        • The cron job checks every 30 minutes for unassigned
                        leads during the active window.
                      </li>
                      <li>
                        • Online &amp; verified employees get leads assigned
                        automatically in a round-robin pattern.
                      </li>
                      <li>
                        • The inactivity timeout controls both the auto-logout
                        popup and the server-side offline detection (heartbeat).
                      </li>
                      <li>
                        • These settings are unique to your organization.
                      </li>
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
