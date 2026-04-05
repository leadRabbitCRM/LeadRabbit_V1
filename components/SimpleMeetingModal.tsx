"use client";
import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { CalendarIcon } from "@heroicons/react/24/solid";

interface SimpleMeetingModalProps {
  leadName: string;
  leadEmail?: string;
  onMeetingCreated?: (meeting: any) => void;
}

export default function SimpleMeetingModal({
  leadName,
  leadEmail,
  onMeetingCreated,
}: SimpleMeetingModalProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: `Meeting with ${leadName}`,
    description: "",
    date: "",
    time: "",
    duration: "60",
    location: "Office",
  });

  const handleInputChange = (field: string, value: string) => {
    setMeetingForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date || !meetingForm.time) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate meeting creation
      const meeting = {
        id: Date.now().toString(),
        title: meetingForm.title,
        description: meetingForm.description,
        date: meetingForm.date,
        time: meetingForm.time,
        duration: parseInt(meetingForm.duration),
        location: meetingForm.location,
        attendees: leadEmail ? [leadEmail] : [],
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      // Call the callback function
      if (onMeetingCreated) {
        onMeetingCreated(meeting);
      }

      // Reset form
      setMeetingForm({
        title: `Meeting with ${leadName}`,
        description: "",
        date: "",
        time: "",
        duration: "60",
        location: "Office",
      });

      onOpenChange();
      alert("Meeting created successfully!");
    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Failed to create meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default date to tomorrow
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setMeetingForm((prev) => ({ ...prev, date: dateStr }));
  }, []);

  return (
    <>
      <Button
        onPress={onOpen}
        color="primary"
        variant="flat"
        startContent={<CalendarIcon className="w-4 h-4" />}
        className="w-full"
      >
        Create Meeting
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3>Create Meeting with {leadName}</h3>
                <p className="text-sm text-gray-600">
                  Schedule a meeting for this lead
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Meeting Title"
                    placeholder="Enter meeting title"
                    value={meetingForm.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    isRequired
                  />

                  <Textarea
                    label="Description"
                    placeholder="Enter meeting description"
                    value={meetingForm.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Date"
                      value={meetingForm.date}
                      onChange={(e) =>
                        handleInputChange("date", e.target.value)
                      }
                      isRequired
                    />

                    <Input
                      type="time"
                      label="Time"
                      value={meetingForm.time}
                      onChange={(e) =>
                        handleInputChange("time", e.target.value)
                      }
                      isRequired
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Duration (minutes)"
                      value={meetingForm.duration}
                      onChange={(e) =>
                        handleInputChange("duration", e.target.value)
                      }
                      min="15"
                      max="480"
                    />

                    <Input
                      label="Location"
                      placeholder="Meeting location"
                      value={meetingForm.location}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                    />
                  </div>

                  {leadEmail && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Attendee:</strong> {leadEmail}
                      </p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateMeeting}
                  isLoading={isSubmitting}
                  isDisabled={
                    !meetingForm.title || !meetingForm.date || !meetingForm.time
                  }
                >
                  Create Meeting
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
