"use client";
import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  useDisclosure,
  Chip,
} from "@heroui/react";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/solid";

interface CreateMeetingButtonProps {
  leadName?: string;
  leadEmail?: string;
  onMeetingCreated?: (event: any) => void;
  className?: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  accessToken: string;
}

export default function CreateMeetingButton({
  leadName = "Lead",
  leadEmail = "",
  onMeetingCreated,
  className = "",
}: CreateMeetingButtonProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [meetingForm, setMeetingForm] = useState({
    title: `Meeting with ${leadName}`,
    description: `Follow-up meeting to discuss requirements and next steps with ${leadName}.`,
    date: "",
    startTime: "14:00",
    endTime: "15:00",
  });

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();

      if (data.authUrl) {
        // Store current state for after auth
        sessionStorage.setItem(
          "pendingMeeting",
          JSON.stringify({
            leadName,
            leadEmail,
            meetingForm,
          }),
        );

        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get authentication URL");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google login");
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!googleUser) {
      await handleGoogleAuth();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate form
      if (
        !meetingForm.title ||
        !meetingForm.date ||
        !meetingForm.startTime ||
        !meetingForm.endTime
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Create datetime strings
      const startDateTime = new Date(
        `${meetingForm.date}T${meetingForm.startTime}`,
      );
      const endDateTime = new Date(
        `${meetingForm.date}T${meetingForm.endTime}`,
      );

      if (endDateTime <= startDateTime) {
        throw new Error("End time must be after start time");
      }

      // Prepare attendees
      const attendees = leadEmail ? [leadEmail] : [];

      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: googleUser.accessToken,
          title: meetingForm.title,
          description: meetingForm.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendees,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create meeting");
      }

      // Success callback
      if (onMeetingCreated) {
        onMeetingCreated(data.event);
      }

      // Close modal and reset
      onOpenChange();
      setMeetingForm({
        title: `Meeting with ${leadName}`,
        description: `Follow-up meeting to discuss requirements and next steps with ${leadName}.`,
        date: "",
        startTime: "14:00",
        endTime: "15:00",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create meeting");
    } finally {
      setIsLoading(false);
    }
  };

  // Set default date to tomorrow
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    setMeetingForm((prev) => ({ ...prev, date: dateStr }));
  }, []);

  // Check for returning from Google OAuth
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const userEmail = urlParams.get("user_email");
    const userName = urlParams.get("user_name");

    if (accessToken && userEmail) {
      setGoogleUser({
        accessToken,
        email: userEmail,
        name: userName || userEmail,
      });
      setIsGoogleAuth(true);

      // Restore pending meeting data
      const pendingMeeting = sessionStorage.getItem("pendingMeeting");
      if (pendingMeeting) {
        const data = JSON.parse(pendingMeeting);
        setMeetingForm(data.meetingForm);
        sessionStorage.removeItem("pendingMeeting");
        onOpen(); // Auto-open modal
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onOpen]);

  return (
    <>
      <Button
        color="primary"
        startContent={<CalendarDaysIcon className="w-4 h-4" />}
        onPress={onOpen}
        className={className}
      >
        Create Meeting
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-primary" />
                  Schedule Meeting with {leadName}
                </div>
                {googleUser && (
                  <Chip size="sm" color="success" variant="flat">
                    Connected: {googleUser.email}
                  </Chip>
                )}
              </ModalHeader>
              <ModalBody className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                    <p className="text-danger text-sm">{error}</p>
                  </div>
                )}

                <Input
                  label="Meeting Title"
                  value={meetingForm.title}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  isRequired
                />

                <Textarea
                  label="Description"
                  value={meetingForm.description}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="date"
                    label="Date"
                    value={meetingForm.date}
                    onChange={(e) =>
                      setMeetingForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    isRequired
                  />
                  <Input
                    type="time"
                    label="Start Time"
                    value={meetingForm.startTime}
                    onChange={(e) =>
                      setMeetingForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    isRequired
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={meetingForm.endTime}
                    onChange={(e) =>
                      setMeetingForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    isRequired
                  />
                </div>

                {leadEmail && (
                  <div className="p-3 rounded-lg bg-primary-50 border border-primary-200">
                    <p className="text-sm">
                      <strong>Attendee:</strong> {leadEmail}
                    </p>
                  </div>
                )}

                {!googleUser && (
                  <div className="p-3 rounded-lg bg-warning-50 border border-warning-200">
                    <p className="text-sm text-warning-700">
                      You&apos;ll need to sign in with Google to create the
                      calendar event.
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateMeeting}
                  isLoading={isLoading}
                  startContent={!isLoading && <ClockIcon className="w-4 h-4" />}
                >
                  {!googleUser ? "Sign in & Create Meeting" : "Create Meeting"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
