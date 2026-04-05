import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  addToast,
} from "@heroui/react";
import { DatePicker } from "@heroui/date-picker";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import { PlusIcon } from "@heroicons/react/24/outline";
import { HiCalendarDateRange, HiExclamationTriangle } from "react-icons/hi2";
import { FaLocationDot, FaGoogle } from "react-icons/fa6";
import { BsFillCalendarXFill } from "react-icons/bs";
import { MdEditCalendar } from "react-icons/md";
import {
  CalendarDate,
  parseDate,
  getLocalTimeZone,
  today,
} from "@internationalized/date";

import CalendarCard from "./CalendarCard";
import GoogleCalendarConnect from "@/components/shared/GoogleCalendarConnect";

const itemClasses = {
  base: "py-0 w-full",
  title: "font-normal text-medium",
  trigger: "px-2 py-0 rounded-lg h-14 flex items-center",
  indicator: "text-medium",
  content: "text-small px-2",
};

const DEFAULT_TIME_ZONE = "Asia/Kolkata"; // IST timezone

function generateTimeSlots() {
  const slots = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const date = new Date(0, 0, 0, hour, minute);
      const label = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      slots.push(label);
    }
  }

  return slots;
}

const TIME_OPTIONS = generateTimeSlots();

function formatDateLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractMonthAndDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return { month: "", date: "" };
  }

  return {
    month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    date: date.getDate().toString().padStart(2, "0"),
  };
}

function MeetingEmptyState() {
  return (
    <div className="rounded-xl bg-content2/40 p-4 text-center text-xs text-default-500">
      No meetings scheduled yet.
    </div>
  );
}

const initialFormState = {
  title: "",
  date: null, // Changed to null for DatePicker
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  timeZone: "Asia/Kolkata", // Always use IST
  attendeeEmail: "",
};

// Helper functions for date conversion
function stringToDateValue(dateString) {
  if (!dateString) return null;
  try {
    return parseDate(dateString);
  } catch (error) {
    console.warn("Invalid date string:", dateString);
    return null;
  }
}

function dateValueToString(dateValue) {
  if (!dateValue) return "";
  return dateValue.toString();
}

function normalizeMeetingId(rawId) {
  if (!rawId) return null;
  if (typeof rawId === "string") return rawId;
  if (typeof rawId.toString === "function") return rawId.toString();
  return `${rawId}`;
}

export default function LeadMeetingDetalsTable({
  meetings = [],
  onCreateMeeting,
  onRescheduleMeeting,
  onCancelMeeting,
  actionState,
  clearActionError,
  leadEmail = "", // Add lead email for Google Calendar invites
  leadName = "", // Add lead name for better meeting titles
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formError, setFormError] = useState(null);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] =
    useState(false);

  const sortedMeetings = useMemo(() => {
    if (!Array.isArray(meetings)) return [];

    const deriveSortKey = (meeting) => {
      if (
        typeof meeting?.startDateTime === "string" &&
        meeting.startDateTime.length > 0
      ) {
        return meeting.startDateTime;
      }

      return `${meeting?.date ?? ""}-${meeting?.startTimeLabel ?? ""}`;
    };

    return [...meetings].sort((a, b) =>
      deriveSortKey(a).localeCompare(deriveSortKey(b)),
    );
  }, [meetings]);

  const resetForm = () => {
    setFormState({
      ...initialFormState,
      date: null, // Reset to null for DatePicker
      title: leadName ? `Meeting with ${leadName}` : "",
      attendeeEmail: leadEmail || "",
    });
    setFormError(null);
    setEditingMeetingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    if (clearActionError) clearActionError();
    setIsModalOpen(true);
  };

  const openEditModal = (meeting) => {
    setFormState({
      title: meeting.title ?? "",
      date: stringToDateValue(meeting.date), // Convert to DateValue
      startTime: meeting.startTimeLabel ?? "",
      endTime: meeting.endTimeLabel ?? "",
      location: meeting.location ?? "",
      description: meeting.description ?? "",
      timeZone: "Asia/Kolkata", // Always use IST
      attendeeEmail: meeting.attendeeEmail || leadEmail || "",
    });
    setFormError(null);
    setEditingMeetingId(meeting._id);
    if (clearActionError) clearActionError();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (field) => (value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
    if (clearActionError) clearActionError();
  };

  const handleSubmit = async () => {
    if (
      !formState.title ||
      !formState.date ||
      !formState.startTime ||
      !formState.endTime
    ) {
      setFormError("Please fill in the title, date, and both start/end times.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      title: formState.title,
      date: dateValueToString(formState.date), // Convert DateValue to string
      startTime: formState.startTime,
      endTime: formState.endTime,
      location: formState.location,
      description: formState.description,
      timeZone: "Asia/Kolkata", // Always use IST
      attendeeEmail: formState.attendeeEmail,
    };

    const normalizedMeetingId = normalizeMeetingId(editingMeetingId);

    try {
      // Call the server API which handles Google Calendar automatically
      // (using the user's stored OAuth tokens if connected)
      const result = normalizedMeetingId
        ? await onRescheduleMeeting?.(normalizedMeetingId, payload)
        : await onCreateMeeting?.(payload);

      if (!result?.success) {
        setFormError(result?.error || "Failed to save meeting");
        addToast({
          title: "Error",
          description: result?.error || "Failed to save meeting",
          color: "danger",
          classNames: {
            base: "bg-red-50 border border-red-200 shadow-lg",
            title: "text-red-800 font-semibold",
            description: "text-red-700",
          },
        });
        return;
      }

      // Show appropriate toast based on whether calendar was synced
      const isGoogleSynced = result?.isGoogleCalendar;

      if (isGoogleSynced) {
        addToast({
          title: "Success",
          description: normalizedMeetingId
            ? "Meeting rescheduled and Google Calendar updated!"
            : "Meeting created and added to your Google Calendar!",
          color: "success",
          classNames: {
            base: "bg-green-50 border border-green-200 shadow-lg",
            title: "text-green-800 font-semibold",
            description: "text-green-700",
          },
        });
      } else {
        addToast({
          title: "Success",
          description: normalizedMeetingId
            ? "Meeting rescheduled successfully!"
            : "Meeting created successfully!",
          color: "success",
          classNames: {
            base: "bg-green-50 border border-green-200 shadow-lg",
            title: "text-green-800 font-semibold",
            description: "text-green-700",
          },
        });
      }

      // Close modal only on success
      closeModal();
      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
      setFormError("An unexpected error occurred. Please try again.");
      addToast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        color: "danger",
        classNames: {
          base: "bg-red-50 border border-red-200 shadow-lg",
          title: "text-red-800 font-semibold",
          description: "text-red-700",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMeeting = async (meeting) => {
    const normalizedId = normalizeMeetingId(meeting._id);
    if (!normalizedId) return;

    // Server handles Google Calendar cancellation automatically
    await onCancelMeeting?.(normalizedId);
  };

  const renderStatusChip = (status) => {
    if (!status || status === "scheduled") return null;

    const normalized = status.toString().toLowerCase();

    const chipProps =
      normalized === "cancelled"
        ? { color: "danger", label: "Cancelled" }
        : { color: "warning", label: status };

    return (
      <Chip size="sm" color={chipProps.color} variant="flat">
        {chipProps.label}
      </Chip>
    );
  };

  const renderMeetingTitle = (meeting) => (
    <div className="flex flex-col text-left gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
            {meeting.title || "Scheduled meeting"}
          </span>
          {meeting.localOnly && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium text-xs whitespace-nowrap">
              Local Only
            </span>
          )}
        </div>
        {renderStatusChip(meeting.status)}
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-xs text-gray-600">
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium inline-block w-fit text-xs">
          {formatDateLabel(meeting.date)}
        </span>
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium inline-block w-fit text-xs">
          {meeting.startTimeLabel || meeting.startTime} -{" "}
          {meeting.endTimeLabel || meeting.endTime}
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6">
      <div className="pb-3 sm:pb-6 flex flex-col gap-3">
        <div className="flex-1">
          <div className="text-xs sm:text-sm text-gray-500 mb-1">
            Schedule & Track Meetings
          </div>
        </div>

        {/* Google Calendar Connection */}
        <GoogleCalendarConnect
          compact={true}
          onStatusChange={(connected) =>
            setIsGoogleCalendarConnected(connected)
          }
        />

        <Button
          size="md"
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 active:scale-95 min-h-[48px] px-4 w-full"
          startContent={
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            </div>
          }
          onPress={openCreateModal}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative z-10 text-sm sm:text-base">
            Schedule Meeting
          </span>
        </Button>
      </div>

      {actionState?.error && (
        <div className="mb-3 rounded-lg bg-danger-100/70 px-3 py-2 text-xs text-danger-700">
          {actionState.error}
        </div>
      )}

      {sortedMeetings.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No meetings scheduled
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Create your first meeting to get started
          </p>
        </div>
      ) : (
        <Accordion
          className="flex flex-col gap-2 sm:gap-4"
          itemClasses={{
            base: "py-0 w-full bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300",
            title: "font-medium text-sm",
            trigger:
              "px-3 sm:px-6 py-3 sm:py-5 hover:bg-gray-50 transition-all duration-200 rounded-t-xl sm:rounded-t-2xl min-h-[60px] sm:min-h-auto",
            content:
              "px-3 sm:px-6 pb-3 sm:pb-6 bg-gradient-to-br from-gray-50 to-white rounded-b-xl sm:rounded-b-2xl border-t border-gray-100",
          }}
          showDivider={false}
          variant="light"
        >
          {sortedMeetings.map((meeting) => (
            <AccordionItem
              key={meeting._id?.toString?.() ?? meeting._id ?? meeting.title}
              aria-label={meeting.title}
              startContent={(() => {
                const { month, date } = extractMonthAndDate(meeting.date);
                return <CalendarCard month={month} date={date} />;
              })()}
              title={renderMeetingTitle(meeting)}
            >
              <div className="space-y-3 sm:space-y-5 text-gray-800">
                {/* Event Details Card */}
                <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HiCalendarDateRange className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {formatDateLabel(meeting.date)}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {meeting.startTimeLabel || meeting.startTime} -{" "}
                        {meeting.endTimeLabel || meeting.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaLocationDot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        Location
                      </p>
                      <p className="text-xs text-gray-600 break-words">
                        {meeting.location || "Location not specified"}
                      </p>
                    </div>
                  </div>

                  {meeting.localOnly && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiExclamationTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Local Only
                        </p>
                        <p className="text-xs text-gray-600">
                          This meeting is stored locally. Google Calendar
                          integration is not configured.
                        </p>
                      </div>
                    </div>
                  )}

                  {meeting.googleEventLink && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FaGoogle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Google Calendar
                        </p>
                        <a
                          href={meeting.googleEventLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline transition-colors block"
                        >
                          View in Calendar →
                        </a>
                      </div>
                    </div>
                  )}

                  {meeting.hangoutLink && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Meeting Link
                        </p>
                        <a
                          href={meeting.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-purple-600 hover:text-purple-700 underline transition-colors block"
                        >
                          Join Meeting →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {meeting.description && (
                  <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        About This Event
                      </h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {meeting.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-2">
                  <Button
                    size="md"
                    className="group relative overflow-hidden bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-blue-400 rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-md active:scale-95 min-h-[46px] sm:min-h-[44px] px-3 sm:px-4 flex-1"
                    startContent={
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <MdEditCalendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                      </div>
                    }
                    isDisabled={actionState?.submitting}
                    onPress={() => openEditModal(meeting)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 font-medium text-sm">
                      Reschedule Event
                    </span>
                  </Button>
                  <Button
                    size="md"
                    className="group relative overflow-hidden bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-red-400 rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-md active:scale-95 min-h-[46px] sm:min-h-[44px] px-3 sm:px-4 flex-1"
                    startContent={
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                        <BsFillCalendarXFill className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                      </div>
                    }
                    isDisabled={
                      actionState?.submitting || meeting.status === "cancelled"
                    }
                    onPress={() => handleCancelMeeting(meeting)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 font-medium text-sm">
                      Cancel Event
                    </span>
                  </Button>
                </div>
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Modal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        size="full"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          base: "m-0 h-full max-h-full",
          body: "py-0 overflow-y-auto",
          header: "pb-0 sticky top-0 z-10",
          footer: "pt-0 border-t border-gray-200/60 sticky bottom-0 z-10",
          wrapper: "items-end z-[100000]",
          backdrop: "z-[100000]",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              scale: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: "100%",
              opacity: 0,
              scale: 1,
              transition: {
                duration: 0.25,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="flex flex-col overflow-hidden rounded-none shadow-2xl h-full">
          {() => (
            <>
              <ModalHeader className="relative bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200/60 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-medium text-gray-900 mb-0.5">
                      {editingMeetingId ? "Reschedule Meeting" : "New Meeting"}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {editingMeetingId
                        ? "Update details"
                        : "Schedule appointment"}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="px-4 py-4 bg-white flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-4 pb-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block">
                      Meeting Title *
                    </label>
                    <Input
                      placeholder="Meeting title"
                      value={formState.title}
                      onValueChange={handleInputChange("title")}
                      variant="bordered"
                      size="sm"
                      isRequired
                      classNames={{
                        input:
                          "text-sm text-gray-900 placeholder:text-gray-400",
                        inputWrapper:
                          "border-gray-300 hover:border-blue-400 focus-within:border-blue-500 transition-all duration-200 bg-white h-9",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block">
                      Meeting Date *
                    </label>
                    <DatePicker
                      value={formState.date}
                      onChange={(date) => {
                        setFormState((prev) => ({ ...prev, date }));
                        if (formError) setFormError(null);
                        if (clearActionError) clearActionError();
                      }}
                      variant="bordered"
                      size="sm"
                      isRequired
                      minValue={today(getLocalTimeZone())}
                      showMonthAndYearPickers
                      classNames={{
                        inputWrapper:
                          "border-gray-300 hover:border-blue-400 focus-within:border-blue-500 transition-all duration-200 bg-white h-9",
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700 block">
                        Start Time *
                      </label>
                      <Select
                        selectedKeys={
                          formState.startTime
                            ? new Set([formState.startTime])
                            : new Set([])
                        }
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0];
                          handleInputChange("startTime")(value ?? "");
                        }}
                        variant="bordered"
                        size="sm"
                        placeholder="Select time"
                        classNames={{
                          trigger:
                            "border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-all duration-200 bg-white h-9",
                          value: "text-sm text-gray-900",
                          listbox: "text-sm",
                        }}
                      >
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} className="text-sm">
                            {time}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700 block">
                        End Time *
                      </label>
                      <Select
                        selectedKeys={
                          formState.endTime
                            ? new Set([formState.endTime])
                            : new Set([])
                        }
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0];
                          handleInputChange("endTime")(value ?? "");
                        }}
                        variant="bordered"
                        size="sm"
                        placeholder="Select time"
                        classNames={{
                          trigger:
                            "border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-all duration-200 bg-white h-9",
                          value: "text-sm text-gray-900",
                          listbox: "text-sm",
                        }}
                      >
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} className="text-sm">
                            {time}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block">
                      Location
                    </label>
                    <Input
                      placeholder="Meeting location"
                      value={formState.location}
                      onValueChange={handleInputChange("location")}
                      variant="bordered"
                      size="sm"
                      classNames={{
                        input:
                          "text-sm text-gray-900 placeholder:text-gray-400",
                        inputWrapper:
                          "border-gray-300 hover:border-blue-400 focus-within:border-blue-500 transition-all duration-200 bg-white h-9",
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block">
                      Description
                    </label>
                    <Textarea
                      minRows={2}
                      placeholder="Meeting notes..."
                      value={formState.description}
                      onValueChange={handleInputChange("description")}
                      variant="bordered"
                      classNames={{
                        input:
                          "text-sm text-gray-900 placeholder:text-gray-400",
                        inputWrapper:
                          "border-gray-300 hover:border-blue-400 focus-within:border-blue-500 transition-all duration-200 bg-white",
                      }}
                    />
                  </div>

                  {/* Google Calendar Connection Status */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50 shadow-sm">
                    <GoogleCalendarConnect
                      compact={false}
                      onStatusChange={(connected) =>
                        setIsGoogleCalendarConnected(connected)
                      }
                    />
                    {isGoogleCalendarConnected && !editingMeetingId && (
                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">
                          Attendee Email
                        </label>
                        <Input
                          placeholder="attendee@example.com"
                          value={formState.attendeeEmail}
                          onValueChange={handleInputChange("attendeeEmail")}
                          variant="bordered"
                          size="md"
                          type="email"
                          classNames={{
                            input:
                              "text-base text-gray-900 placeholder:text-gray-500",
                            inputWrapper:
                              "border-gray-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 bg-white shadow-sm h-11",
                          }}
                          description="The attendee will receive a calendar invitation"
                        />
                      </div>
                    )}
                    {!isGoogleCalendarConnected && (
                      <p className="mt-2 text-xs text-amber-600">
                        Meeting will be saved without Google Calendar sync.
                        Connect your account above to enable auto-sync.
                      </p>
                    )}
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{formError}</p>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="bg-white border-t border-gray-200 px-4 py-3 gap-2 flex-shrink-0">
                <Button
                  variant="light"
                  onPress={closeModal}
                  isDisabled={isSubmitting || actionState?.submitting}
                  className="font-medium text-gray-600 hover:bg-gray-100 transition-colors duration-200 px-4 text-sm h-9 flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSubmit}
                  isLoading={isSubmitting || actionState?.submitting}
                  isDisabled={isSubmitting || actionState?.submitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-sm hover:shadow transition-all duration-200 px-4 text-sm h-9 flex-1"
                  size="sm"
                >
                  {editingMeetingId ? "Update" : "Schedule"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
