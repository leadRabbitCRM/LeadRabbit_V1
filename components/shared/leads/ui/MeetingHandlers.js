// Common meeting handlers for both admin and user components
export const createMeetingHandlers = (
  normalizedLeadId,
  meetings,
  propagateMeetings,
  setMeetingActionState,
  handleMeetingActionError,
) => {
  const handleCreateMeeting = async (payload) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setMeetingActionState({ submitting: true, error: null });

    try {
      const response = await fetch(
        `/api/leads/${normalizedLeadId}/meetings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include",
        },
      );

      const result = await response.json();

      if (response.ok) {
        // API success - update local state
        if (result.meeting) {
          const updatedMeetings = [...meetings, result.meeting];
          propagateMeetings(updatedMeetings);
        }
        setMeetingActionState({ submitting: false, error: null });
        return {
          success: true,
          isGoogleCalendar: result.googleCalendarSynced === true,
          isLocalOnly: result.googleCalendarSynced === false,
        };
      } else {
        throw new Error(result.error || "Failed to create meeting");
      }
    } catch (error) {
      console.error("Failed to create meeting", error);
      const message =
        error.message || "Unable to create meeting. Please try again.";
      handleMeetingActionError(message);
      return { success: false, error: message };
    }
  };

  const handleRescheduleMeeting = async (meetingId, payload) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setMeetingActionState({ submitting: true, error: null });

    try {
      const response = await fetch(
        `/api/leads/${normalizedLeadId}/meetings/${meetingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include",
        },
      );

      const result = await response.json();

      if (response.ok) {
        // API success - update local state
        if (result.meetings) {
          propagateMeetings(result.meetings);
        }
        setMeetingActionState({ submitting: false, error: null });
        return { success: true };
      } else {
        throw new Error(result.error || "Failed to reschedule meeting");
      }
    } catch (error) {
      console.error("Failed to reschedule meeting", error);
      const message =
        error.message || "Unable to reschedule meeting. Please try again.";
      handleMeetingActionError(message);
      return { success: false, error: message };
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setMeetingActionState({ submitting: true, error: null });

    try {
      const response = await fetch(
        `/api/leads/${normalizedLeadId}/meetings/${meetingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      const result = await response.json();

      if (response.ok) {
        // API success - update local state
        if (result.meetings) {
          propagateMeetings(result.meetings);
        }
        setMeetingActionState({ submitting: false, error: null });
        return { success: true };
      } else {
        throw new Error(result.error || "Failed to cancel meeting");
      }
    } catch (error) {
      console.error("Failed to cancel meeting", error);
      const message =
        error.message || "Unable to cancel meeting. Please try again.";
      handleMeetingActionError(message);
      return { success: false, error: message };
    }
  };

  return {
    handleCreateMeeting,
    handleRescheduleMeeting,
    handleCancelMeeting,
  };
};
