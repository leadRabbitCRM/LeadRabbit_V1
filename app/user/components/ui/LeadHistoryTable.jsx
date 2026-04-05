import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from "@heroui/react";
import { DatePicker } from "@heroui/date-picker";
import { VerticalDotsIcon } from "@/app/admin/components/taskTable";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  CalendarDate,
  parseDate,
  getLocalTimeZone,
  today,
} from "@internationalized/date";

const DEFAULT_TYPE_OPTIONS = [
  "Call",
  "Email",
  "Meeting",
  "WhatsApp",
  "Text",
  "LinkedIn",
  "Follow-up",
];

const initialFormState = {
  date: null, // Changed to null for DatePicker
  type: DEFAULT_TYPE_OPTIONS[0],
  customType: "",
  note: "",
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

function normalizeEngagementId(rawId) {
  if (!rawId) return null;
  if (typeof rawId === "string") return rawId;
  if (typeof rawId.toString === "function") return rawId.toString();
  return `${rawId}`;
}

function getDateParts(dateString) {
  if (!dateString) return { month: "", day: "", year: "" };

  const parsed = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return { month: "", day: dateString, year: "" };
  }

  return {
    month: parsed.toLocaleString("en-US", { month: "short" }),
    day: parsed.getDate().toString().padStart(2, "0"),
    year: parsed.getFullYear().toString(),
  };
}

function resolveTypeLabel(typeOptions, value) {
  if (!value) return "";
  if (typeOptions.some((option) => option === value)) return value;

  const match = typeOptions.find(
    (option) => option.toLowerCase() === value.toLowerCase(),
  );

  return match ?? value;
}

export default function LeadHistoryTable({
  engagements = [],
  onCreateEngagement,
  onUpdateEngagement,
  onDeleteEngagement,
  actionState,
  clearActionError,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formError, setFormError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const typeOptions = useMemo(() => {
    const unique = new Set(DEFAULT_TYPE_OPTIONS);

    engagements.forEach((engagement) => {
      if (engagement?.type && typeof engagement.type === "string") {
        unique.add(engagement.type);
      }
    });

    return Array.from(unique.values());
  }, [engagements]);

  const sortedEngagements = useMemo(() => {
    if (!Array.isArray(engagements)) return [];

    const toTimestamp = (value) => {
      if (!value) return Number.NEGATIVE_INFINITY;
      if (value instanceof Date) return value.getTime();

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

      if (typeof value === "string") {
        const fallback = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(fallback.getTime())) return fallback.getTime();
      }

      return Number.NEGATIVE_INFINITY;
    };

    return [...engagements].sort((a, b) => {
      const primaryDiff = toTimestamp(b?.date) - toTimestamp(a?.date);
      if (primaryDiff !== 0) return primaryDiff;

      const secondaryDiff =
        toTimestamp(b?.updatedAt ?? b?.createdAt) -
        toTimestamp(a?.updatedAt ?? a?.createdAt);

      return secondaryDiff;
    });
  }, [engagements]);

  const resetForm = useCallback(() => {
    setFormState((prev) => ({
      ...initialFormState,
      type: typeOptions[0] ?? prev.type,
      date: null, // Reset to null for DatePicker
    }));
    setFormError(null);
    setEditingId(null);
  }, [typeOptions]);

  const openCreateModal = useCallback(() => {
    resetForm();
    if (clearActionError) clearActionError();
    setIsModalOpen(true);
  }, [resetForm, clearActionError]);

  const openEditModal = useCallback(
    (engagement) => {
      if (!engagement) return;

      const normalizedId = normalizeEngagementId(engagement._id);
      const normalizedType = resolveTypeLabel(
        typeOptions,
        engagement.type ?? "",
      );
      const isKnownType = typeOptions.some(
        (option) =>
          option.toLowerCase() === (engagement.type ?? "").toLowerCase(),
      );

      setFormState({
        date: stringToDateValue(engagement.date), // Convert to DateValue
        type: isKnownType
          ? normalizedType
          : (typeOptions[0] ?? DEFAULT_TYPE_OPTIONS[0]),
        customType: isKnownType ? "" : (engagement.type ?? ""),
        note: engagement.note ?? "",
      });
      setFormError(null);
      setEditingId(normalizedId);
      if (clearActionError) clearActionError();
      setIsModalOpen(true);
    },
    [typeOptions, clearActionError],
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleInputChange = useCallback(
    (field) => (value) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (formError) setFormError(null);
      if (clearActionError) clearActionError();
    },
    [formError, clearActionError],
  );

  const handleTypeSelection = useCallback(
    (selectedKeys) => {
      const value = Array.from(selectedKeys)[0] ?? "";
      setFormState((prev) => ({ ...prev, type: value, customType: "" }));
      if (formError) setFormError(null);
      if (clearActionError) clearActionError();
    },
    [formError, clearActionError],
  );

  const handleSubmit = useCallback(async () => {
    if (!formState.date) {
      setFormError("Please choose a date for this engagement.");
      return;
    }

    const resolvedCustomType = formState.customType?.trim();
    const resolvedType = resolvedCustomType?.length
      ? resolvedCustomType
      : formState.type?.trim();

    if (!resolvedType) {
      setFormError("Please select or enter an engagement type.");
      return;
    }

    const payload = {
      date: dateValueToString(formState.date), // Convert DateValue to string
      type: formState.type,
      customType: formState.customType,
      note: formState.note,
    };

    const normalizedId = normalizeEngagementId(editingId);

    const result = normalizedId
      ? await onUpdateEngagement?.(normalizedId, payload)
      : await onCreateEngagement?.(payload);

    if (result?.success) {
      closeModal();
      resetForm();
    } else if (result?.error) {
      setFormError(result.error);
    }
  }, [
    formState,
    editingId,
    onCreateEngagement,
    onUpdateEngagement,
    closeModal,
    resetForm,
  ]);

  const openDeleteModal = useCallback(
    (engagement) => {
      const normalizedId = normalizeEngagementId(engagement?._id);
      if (!normalizedId) return;

      if (clearActionError) clearActionError();
      setPendingDeleteId(normalizedId);
      setDeleteError(null);
      setIsDeleteModalOpen(true);
    },
    [clearActionError],
  );

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setPendingDeleteId(null);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;

    const result = await onDeleteEngagement?.(pendingDeleteId);

    if (result?.success) {
      closeDeleteModal();
    } else if (result?.error) {
      setDeleteError(result.error);
    }
  }, [pendingDeleteId, onDeleteEngagement, closeDeleteModal]);

  const renderCell = useCallback(
    (engagement, columnKey) => {
      switch (columnKey) {
        case "date": {
          const { month, day, year } = getDateParts(engagement.date);
          return (
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-white text-center shadow">
              <span className="w-full rounded-md bg-primary-500 text-[10px] font-semibold uppercase text-white">
                {month}
              </span>
              <span className="text-base font-bold text-gray-800">{day}</span>
              <span className="pb-1 text-[10px] font-bold text-gray-500">
                {year}
              </span>
            </div>
          );
        }
        case "type":
          return (
            <Chip
              className="capitalize"
              color="secondary"
              size="sm"
              variant="flat"
            >
              {engagement.type}
            </Chip>
          );
        case "note":
          return (
            <div className="text-left text-xs text-gray-600 whitespace-normal break-words w-full">
              {engagement.note || "—"}
            </div>
          );
        case "actions":
          return (
            <div className="flex items-center justify-end">
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <VerticalDotsIcon className="text-default-400" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  onAction={(key) => {
                    if (key === "edit") {
                      openEditModal(engagement);
                    }
                    if (key === "delete") {
                      openDeleteModal(engagement);
                    }
                  }}
                >
                  <DropdownItem key="edit">Edit</DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        default:
          return engagement[columnKey];
      }
    },
    [openEditModal, openDeleteModal],
  );

  return (
    <div className="p-4 sm:p-6 w-full overflow-hidden">
      <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs sm:text-sm text-gray-500 mb-1">
            Communication Log
          </div>
        </div>
        <Button
          size="md"
          className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 hover:from-green-600 hover:via-emerald-700 hover:to-teal-800 text-white font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 active:scale-95 min-h-[44px] px-6 w-full sm:w-auto"
          startContent={
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
              <PlusIcon className="w-5 h-5 relative z-10" />
            </div>
          }
          onPress={openCreateModal}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative z-10">Log Engagement</span>
        </Button>
      </div>

      {actionState?.error && (
        <div className="mb-3 rounded-lg bg-danger-100/80 px-3 py-2 text-xs text-danger-700">
          {actionState.error}
        </div>
      )}

      {sortedEngagements.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No engagement history yet
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Add your first interaction to start tracking communications
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto relative">
          {/* Top fade effect */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
          {/* Bottom fade effect */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>
          <Table
            aria-label="Lead engagement history"
            classNames={{
              base: "max-h-[300px] sm:max-h-[400px] overflow-y-auto rounded-xl bg-white border border-gray-200 w-full",
              th: "bg-gray-50 text-xs uppercase text-gray-600 font-medium h-8",
              td: "text-xs sm:text-sm py-1 align-top h-10",
              table: "w-full table-auto",
              tr: "h-10",
            }}
          >
            <TableHeader>
              <TableColumn key="date" className="w-auto">
                Date
              </TableColumn>
              <TableColumn key="type" className="w-auto">
                Type
              </TableColumn>
              <TableColumn key="note" className="w-full min-w-[400px]">
                Note
              </TableColumn>
              <TableColumn key="actions" className="w-auto" align="end">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody items={sortedEngagements} emptyContent="">
              {(engagement) => (
                <TableRow key={normalizeEngagementId(engagement._id)}>
                  {(columnKey) => (
                    <TableCell>{renderCell(engagement, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        size="2xl"
        backdrop="blur"
        placement="center"
        classNames={{
          base: "mx-2 sm:mx-4 max-w-2xl",
          body: "py-6",
          header: "pb-4",
          footer: "pt-4 border-t border-gray-200",
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
              y: -20,
              opacity: 0,
              scale: 0.95,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="overflow-hidden rounded-2xl shadow-2xl bg-white">
          {() => (
            <>
              <ModalHeader className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-4 py-3 border-b border-green-100/50">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 via-emerald-400/10 to-teal-400/10 backdrop-blur-sm"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20 flex-shrink-0">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">
                      {editingId ? "Update Engagement" : "New Engagement"}
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {editingId
                        ? "Edit communication record"
                        : "Log interaction with lead"}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="px-4 py-3 bg-gradient-to-b from-white to-gray-50/30">
                <div className="space-y-3">
                  {/* Date & Type Row */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-green-100 rounded-sm flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-green-600"
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
                        Date *
                      </label>
                      <DatePicker
                        value={formState.date}
                        onChange={(date) => {
                          setFormState((prev) => ({ ...prev, date }));
                          if (formError) setFormError(null);
                          if (clearActionError) clearActionError();
                        }}
                        isRequired
                        variant="bordered"
                        size="sm"
                        maxValue={today(getLocalTimeZone())}
                        showMonthAndYearPickers
                        classNames={{
                          inputWrapper:
                            "border-gray-300 hover:border-green-400 focus-within:border-green-500 transition-all duration-200 bg-white h-9",
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-100 rounded-sm flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                        </div>
                        Type *
                      </label>
                      <Select
                        selectedKeys={
                          formState.type
                            ? new Set([formState.type])
                            : new Set([])
                        }
                        onSelectionChange={handleTypeSelection}
                        variant="bordered"
                        size="sm"
                        placeholder="Select type"
                        classNames={{
                          trigger:
                            "border-gray-300 hover:border-green-400 focus:border-green-500 transition-all duration-200 bg-white h-9",
                          value: "text-sm text-gray-900",
                          listbox: "text-sm",
                        }}
                      >
                        {typeOptions.map((option) => (
                          <SelectItem
                            key={option}
                            className="text-sm py-2 hover:bg-green-50"
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Custom Type */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200/50">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-100 rounded-sm flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                        Custom Type (Optional)
                      </label>
                      <Input
                        placeholder="e.g., Demo, Site visit, Video call"
                        value={formState.customType}
                        onValueChange={handleInputChange("customType")}
                        variant="bordered"
                        size="sm"
                        classNames={{
                          input:
                            "text-sm text-gray-900 placeholder:text-gray-400",
                          inputWrapper:
                            "border-blue-200 hover:border-blue-300 focus-within:border-blue-500 transition-all duration-200 bg-white/80 h-9",
                        }}
                      />
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-purple-100 rounded-sm flex items-center justify-center">
                        <svg
                          className="w-2 h-2 text-purple-600"
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
                      Notes & Summary
                    </label>
                    <Textarea
                      placeholder="What was discussed? Outcome? Next steps? Include details like budget, timeline, concerns..."
                      value={formState.note}
                      onValueChange={handleInputChange("note")}
                      minRows={3}
                      variant="bordered"
                      classNames={{
                        input:
                          "text-sm text-gray-900 placeholder:text-gray-400 leading-relaxed",
                        inputWrapper:
                          "border-gray-300 hover:border-purple-400 focus-within:border-purple-500 transition-all duration-200 bg-white",
                      }}
                    />
                  </div>

                  {formError && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-2.5 h-2.5 text-white"
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
                        <p className="text-xs font-medium text-red-800">
                          Error
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                          {formError}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-t border-gray-200/60">
                <div className="w-full flex gap-2">
                  <Button
                    variant="flat"
                    onPress={closeModal}
                    isDisabled={actionState?.submitting}
                    size="sm"
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200 border border-gray-300 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleSubmit}
                    isLoading={actionState?.submitting}
                    size="sm"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0 h-9"
                  >
                    {actionState?.submitting ? (
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="animate-spin h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="text-xs">
                          {editingId ? "Updating..." : "Saving..."}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              editingId
                                ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                : "M5 13l4 4L19 7"
                            }
                          />
                        </svg>
                        <span className="text-xs">
                          {editingId ? "Update" : "Log Entry"}
                        </span>
                      </div>
                    )}
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setPendingDeleteId(null);
            setDeleteError(null);
          }
        }}
        className="max-w-sm"
        backdrop="blur"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2 text-danger-500">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Delete engagement
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  This engagement record will be permanently removed. Are you
                  sure you want to continue?
                </p>
                {deleteError && (
                  <div className="rounded-lg bg-danger-100/80 px-3 py-2 text-xs text-danger-700">
                    {deleteError}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={closeDeleteModal}
                  isDisabled={actionState?.submitting}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={actionState?.submitting}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
