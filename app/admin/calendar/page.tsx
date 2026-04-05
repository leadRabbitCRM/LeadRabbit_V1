"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Divider,
  Spinner,
} from "@heroui/react";
import {
  CalendarDaysIcon,
  UserCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";

interface UserInfo {
  email: string;
  name: string;
  accessToken: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  htmlLink: string;
  attendees?: Array<{ email: string; responseStatus: string }>;
}

export default function CalendarPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    attendees: "",
  });

  // Check URL parameters for OAuth callback data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const userEmail = urlParams.get("user_email");
    const userName = urlParams.get("user_name");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
    } else if (accessToken && userEmail) {
      setUserInfo({
        accessToken,
        email: userEmail,
        name: userName || userEmail,
      });
      setIsAuthenticated(true);
      setSuccess("Successfully authenticated with Google!");

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get authentication URL");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google login");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    setCreatedEvent(null);
    setSuccess(null);
    setError(null);
    setEventForm({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      attendees: "",
    });
  };

  const handleCreateEvent = async () => {
    if (!userInfo) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (
        !eventForm.title ||
        !eventForm.date ||
        !eventForm.startTime ||
        !eventForm.endTime
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Create datetime strings
      const startDateTime = new Date(
        `${eventForm.date}T${eventForm.startTime}`,
      );
      const endDateTime = new Date(`${eventForm.date}T${eventForm.endTime}`);

      if (endDateTime <= startDateTime) {
        throw new Error("End time must be after start time");
      }

      // Prepare attendees
      const attendees = eventForm.attendees
        ? eventForm.attendees
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email)
        : [];

      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: userInfo.accessToken,
          title: eventForm.title,
          description: eventForm.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendees,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      setCreatedEvent(data.event);
      setSuccess("Calendar event created successfully!");

      // Reset form
      setEventForm({
        title: "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
        attendees: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create calendar event");
    } finally {
      setIsLoading(false);
    }
  };

  const getPrefilledMeetingData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    setEventForm({
      title: "Lead Follow-up Meeting",
      description:
        "Follow-up meeting to discuss lead requirements and next steps.",
      date: dateStr,
      startTime: "14:00",
      endTime: "15:00",
      attendees: "",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <CalendarDaysIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Google Calendar Integration</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="mb-6 border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-danger">{error}</p>
          </CardBody>
        </Card>
      )}

      {success && (
        <Card className="mb-6 border-success-200 bg-success-50">
          <CardBody>
            <p className="text-success">{success}</p>
          </CardBody>
        </Card>
      )}

      {!isAuthenticated ? (
        <Card className="text-center">
          <CardHeader>
            <h2 className="text-xl font-semibold">
              Connect your Google Calendar
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-gray-600">
              Sign in with your Google account to create calendar events
              automatically.
            </p>
            <Button
              color="primary"
              size="lg"
              onPress={handleGoogleLogin}
              isLoading={isLoading}
              startContent={
                !isLoading && <UserCircleIcon className="w-5 h-5" />
              }
            >
              {isLoading ? "Connecting..." : "Sign in with Google"}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="w-6 h-6 text-success" />
                <div>
                  <h3 className="font-semibold">Connected Account</h3>
                  <p className="text-sm text-gray-600">{userInfo?.email}</p>
                </div>
              </div>
              <Button
                color="danger"
                variant="light"
                size="sm"
                onPress={handleLogout}
              >
                Disconnect
              </Button>
            </CardHeader>
          </Card>

          {/* Quick Action */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Quick Action</h3>
            </CardHeader>
            <CardBody>
              <Button
                color="secondary"
                onPress={getPrefilledMeetingData}
                startContent={<ClockIcon className="w-4 h-4" />}
              >
                Create Lead Follow-up Meeting
              </Button>
            </CardBody>
          </Card>

          {/* Event Creation Form */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Create Calendar Event</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Event Title *"
                placeholder="Enter event title"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, title: e.target.value }))
                }
                isRequired
              />

              <Textarea
                label="Description"
                placeholder="Enter event description"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="date"
                  label="Date *"
                  value={eventForm.date}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  isRequired
                />
                <Input
                  type="time"
                  label="Start Time *"
                  value={eventForm.startTime}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  isRequired
                />
                <Input
                  type="time"
                  label="End Time *"
                  value={eventForm.endTime}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  isRequired
                />
              </div>

              <Input
                label="Attendees (optional)"
                placeholder="Enter email addresses separated by commas"
                value={eventForm.attendees}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    attendees: e.target.value,
                  }))
                }
                description="Separate multiple emails with commas"
              />

              <Button
                color="primary"
                size="lg"
                onPress={handleCreateEvent}
                isLoading={isLoading}
                isDisabled={
                  !eventForm.title ||
                  !eventForm.date ||
                  !eventForm.startTime ||
                  !eventForm.endTime
                }
                className="w-full"
              >
                {isLoading ? "Creating Event..." : "Create Calendar Event"}
              </Button>
            </CardBody>
          </Card>

          {/* Created Event Display */}
          {createdEvent && (
            <Card className="border-success-200 bg-success-50">
              <CardHeader>
                <h3 className="text-lg font-semibold text-success-800">
                  Event Created Successfully!
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <h4 className="font-medium">{createdEvent.title}</h4>
                  {createdEvent.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {createdEvent.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Chip size="sm" variant="flat">
                    📅 {new Date(createdEvent.startTime).toLocaleDateString()}
                  </Chip>
                  <Chip size="sm" variant="flat">
                    🕐 {new Date(createdEvent.startTime).toLocaleTimeString()} -{" "}
                    {new Date(createdEvent.endTime).toLocaleTimeString()}
                  </Chip>
                </div>

                {createdEvent.attendees &&
                  createdEvent.attendees.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Attendees:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {createdEvent.attendees.map((attendee, index) => (
                          <Chip key={index} size="sm" variant="bordered">
                            {attendee.email}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                <Button
                  as="a"
                  href={createdEvent.htmlLink}
                  target="_blank"
                  color="primary"
                  variant="bordered"
                  size="sm"
                >
                  View in Google Calendar
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
